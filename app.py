# app.py
import os
import re
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
import werkzeug.utils
from datetime import datetime

# 静态资源限定在前端构建产物目录内（避免暴露源码/配置文件）
app = Flask(__name__, static_folder='dist', static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# 项目根目录与前端构建产物目录（npm run build 生成）
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(ROOT_DIR, 'dist')

# ================== 安全配置 ==================
# 定义本地文件操作的安全基目录
BASE_DIR = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'user_workspace'))
os.makedirs(BASE_DIR, exist_ok=True)

# CORS 白名单（根据实际部署域名修改）
ALLOWED_ORIGINS = [
    'http://localhost:5000',      # 本地生产模式
    'http://127.0.0.1:5000',
    'http://localhost:5173',      # Vite 开发服务器
    'http://127.0.0.1:5173',
    # 'https://your-domain.com',  # 生产环境
]
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}}, supports_credentials=True)

def is_safe_filename(filename: str) -> bool:
    """检查文件名是否安全，防止路径遍历"""
    if not filename:
        return False
    if '..' in filename or '/' in filename or '\\' in filename:
        return False
    if not re.match(r'^[\w\-\.]+\.xml$', filename, re.IGNORECASE):
        return False
    return True

def safe_join(base_dir, user_path):
    """安全拼接路径，防止目录遍历"""
    user_path = user_path.replace('\\', '/')
    if '..' in user_path.split('/'):
        return None
    absolute_path = os.path.realpath(os.path.join(base_dir, user_path))
    # 使用 os.sep 结尾比较，避免前缀相似目录绕过（如 /a/user vs /a/user_backup）
    if not (absolute_path == base_dir or absolute_path.startswith(base_dir + os.sep)):
        return None
    return absolute_path

def atomic_write(filepath: str, content: str):
    """原子写入文件（先写临时文件，再替换）"""
    dirname = os.path.dirname(filepath)
    os.makedirs(dirname, exist_ok=True)
    tmp_path = filepath + '.tmp'
    with open(tmp_path, 'w', encoding='utf-8') as f:
        f.write(content)
    os.replace(tmp_path, filepath)  # 原子替换

# ================== 路由 ==================
@app.route('/')
def index():
    if os.path.exists(os.path.join(DIST_DIR, 'index.html')):
        return send_from_directory(DIST_DIR, 'index.html')
    return (
        '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">'
        '<title>PCL 主页编辑器</title></head><body style="font-family:sans-serif;padding:40px">'
        '<h2>尚未构建前端</h2><p>请先执行：</p><pre>npm install\nnpm run build</pre>'
        '<p>开发模式请运行 <code>npm run dev</code>（Vite 开发服务器会自动代理 API）。</p>'
        '</body></html>'
    ), 200

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(DIST_DIR, 'assets'), filename)

# 兼容旧链接：样式表已并入构建产物（/assets/index-*.css）
@app.route('/style.css')
def serve_css_legacy():
    assets_dir = os.path.join(DIST_DIR, 'assets')
    if os.path.isdir(assets_dir):
        css = [f for f in os.listdir(assets_dir) if f.endswith('.css')]
        if css:
            return send_from_directory(assets_dir, css[0])
    abort(404)

# 映射内置图片路径（目录名为 Images）
@app.route('/images/<path:filename>')
def serve_images(filename):
    if '..' in filename or filename.startswith('/'):
        return 'Forbidden', 403
    base = os.path.join(ROOT_DIR, 'Images')
    safe_path = os.path.realpath(os.path.join(base, filename))
    if not safe_path.startswith(base + os.sep):
        return 'Forbidden', 403
    if not os.path.exists(safe_path):
        return 'Not Found', 404
    return send_from_directory(base, filename)

# ================== API ==================
@app.route('/api/files', methods=['GET'])
def list_xml_files():
    try:
        files = [f for f in os.listdir(BASE_DIR) if f.lower().endswith('.xml') and os.path.isfile(os.path.join(BASE_DIR, f))]
        files.sort(key=lambda x: os.path.getmtime(os.path.join(BASE_DIR, x)), reverse=True)
        return jsonify({'success': True, 'files': files})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/save', methods=['POST'])
def save_xml():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '无效的请求数据'}), 400
    filename = data.get('filename', '').strip()
    content = data.get('content', '')
    if not filename:
        return jsonify({'success': False, 'error': '文件名不能为空'}), 400
    if not is_safe_filename(filename):
        return jsonify({'success': False, 'error': '文件名不合法，仅允许字母数字下划线横线，扩展名为.xml'}), 400
    filepath = os.path.join(BASE_DIR, filename)
    try:
        atomic_write(filepath, content)
        return jsonify({'success': True, 'message': f'已保存到 {filename}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/load', methods=['GET'])
def load_xml():
    filename = request.args.get('filename', '').strip()
    if not filename:
        return jsonify({'success': False, 'error': '缺少文件名参数'}), 400
    if not is_safe_filename(filename):
        return jsonify({'success': False, 'error': '文件名不合法'}), 400
    filepath = os.path.join(BASE_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'error': '文件不存在'}), 404
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({'success': True, 'content': content, 'filename': filename})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/delete', methods=['POST'])
def delete_xml():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '无效请求'}), 400
    filename = data.get('filename', '').strip()
    if not filename or not is_safe_filename(filename):
        return jsonify({'success': False, 'error': '文件名不合法'}), 400
    filepath = os.path.join(BASE_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'error': '文件不存在'}), 404
    try:
        os.remove(filepath)
        return jsonify({'success': True, 'message': f'已删除 {filename}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/local/load', methods=['POST'])
def local_load():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '无效请求'}), 400
    user_path = data.get('path', '').strip()
    if not user_path:
        return jsonify({'success': False, 'error': '文件路径不能为空'}), 400
    if not (user_path.lower().endswith('.xaml') or user_path.lower().endswith('.xml')):
        return jsonify({'success': False, 'error': '只支持 .xaml 或 .xml 文件'}), 400
    safe_path = safe_join(BASE_DIR, user_path)
    if not safe_path:
        return jsonify({'success': False, 'error': '非法路径'}), 400
    try:
        with open(safe_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({'success': True, 'content': content, 'path': user_path})
    except FileNotFoundError:
        return jsonify({'success': False, 'error': '文件不存在'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/local/save', methods=['POST'])
def local_save():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '无效请求'}), 400
    user_path = data.get('path', '').strip()
    content = data.get('content', '')
    if not user_path:
        return jsonify({'success': False, 'error': '文件路径不能为空'}), 400
    if not (user_path.lower().endswith('.xaml') or user_path.lower().endswith('.xml')):
        return jsonify({'success': False, 'error': '只支持 .xaml 或 .xml 文件'}), 400
    safe_path = safe_join(BASE_DIR, user_path)
    if not safe_path:
        return jsonify({'success': False, 'error': '非法路径'}), 400
    os.makedirs(os.path.dirname(safe_path), exist_ok=True)
    try:
        atomic_write(safe_path, content)
        return jsonify({'success': True, 'message': f'已保存到 {user_path}', 'path': user_path})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ================== 自动备份模块 ==================
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
os.makedirs(BACKUP_DIR, exist_ok=True)

MAX_BACKUPS = 30

def get_backup_list():
    files = []
    for f in os.listdir(BACKUP_DIR):
        if f.lower().endswith('.xml') and os.path.isfile(os.path.join(BACKUP_DIR, f)):
            path = os.path.join(BACKUP_DIR, f)
            stat = os.stat(path)
            files.append({
                'name': f,
                'size': stat.st_size,
                'modified': stat.st_mtime,
                'modified_str': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            })
    files.sort(key=lambda x: x['modified'], reverse=True)
    return files

def cleanup_old_backups():
    backups = get_backup_list()
    if len(backups) > MAX_BACKUPS:
        for backup in backups[MAX_BACKUPS:]:
            try:
                os.remove(os.path.join(BACKUP_DIR, backup['name']))
            except:
                pass

@app.route('/api/backups', methods=['GET'])
def list_backups():
    try:
        return jsonify({'success': True, 'backups': get_backup_list()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/backup', methods=['POST'])
def create_backup():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '无效请求'}), 400
    content = data.get('content', '')
    if not content.strip():
        return jsonify({'success': False, 'error': '无内容可备份'}), 400

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"backup_{timestamp}.xml"
    filepath = os.path.join(BACKUP_DIR, filename)

    try:
        atomic_write(filepath, content)
        cleanup_old_backups()
        return jsonify({'success': True, 'filename': filename, 'message': '备份已创建'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/backup/load', methods=['GET'])
def load_backup():
    filename = request.args.get('filename', '').strip()
    if not filename:
        return jsonify({'success': False, 'error': '缺少文件名参数'}), 400
    if '..' in filename or '/' in filename or '\\' in filename:
        return jsonify({'success': False, 'error': '非法文件名'}), 400
    if not filename.lower().endswith('.xml'):
        return jsonify({'success': False, 'error': '只支持.xml文件'}), 400

    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'error': '备份文件不存在'}), 404

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({'success': True, 'content': content, 'filename': filename})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/backup/delete', methods=['POST'])
def delete_backup():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '无效请求'}), 400
    filename = data.get('filename', '').strip()
    if not filename:
        return jsonify({'success': False, 'error': '缺少文件名'}), 400
    if '..' in filename or '/' in filename or '\\' in filename:
        return jsonify({'success': False, 'error': '非法文件名'}), 400

    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'error': '文件不存在'}), 404

    try:
        os.remove(filepath)
        return jsonify({'success': True, 'message': f'已删除 {filename}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)