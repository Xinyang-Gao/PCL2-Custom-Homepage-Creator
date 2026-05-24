# app.py
import os
import re
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import werkzeug.utils

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # 允许跨域，方便开发

# 配置文件存储目录（相对于项目根目录）
STORAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'designs')
os.makedirs(STORAGE_DIR, exist_ok=True)

# 后端请求大小限制：限制最大请求体为 16MB，防止超大XAML内容导致性能问题
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

def is_safe_filename(filename: str) -> bool:
    """检查文件名是否安全，防止路径遍历"""
    if not filename:
        return False
    # 只允许字母、数字、下划线、横线、点，且必须以.xml结尾（或允许无后缀，但最好限制）
    # 这里要求最终扩展名为.xml，但中间不能有路径分隔符
    if '..' in filename or '/' in filename or '\\' in filename:
        return False
    if not re.match(r'^[\w\-\.]+\.xml$', filename, re.IGNORECASE):
        return False
    return True

@app.route('/')
def index():
    """提供主页面"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """提供静态文件（css, js等）"""
    return send_from_directory('.', path)

@app.route('/api/files', methods=['GET'])
def list_xml_files():
    """列出存储目录下所有 .xml 文件"""
    try:
        files = [f for f in os.listdir(STORAGE_DIR) if f.lower().endswith('.xml') and os.path.isfile(os.path.join(STORAGE_DIR, f))]
        files.sort(key=lambda x: os.path.getmtime(os.path.join(STORAGE_DIR, x)), reverse=True)
        return jsonify({'success': True, 'files': files})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/save', methods=['POST'])
def save_xml():
    """保存XAML内容到指定文件"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '无效的请求数据'}), 400
    filename = data.get('filename', '').strip()
    content = data.get('content', '')
    if not filename:
        return jsonify({'success': False, 'error': '文件名不能为空'}), 400
    if not is_safe_filename(filename):
        return jsonify({'success': False, 'error': '文件名不合法，仅允许字母数字下划线横线，扩展名为.xml'}), 400
    filepath = os.path.join(STORAGE_DIR, filename)
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return jsonify({'success': True, 'message': f'已保存到 {filename}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/load', methods=['GET'])
def load_xml():
    """读取指定XML文件内容"""
    filename = request.args.get('filename', '').strip()
    if not filename:
        return jsonify({'success': False, 'error': '缺少文件名参数'}), 400
    if not is_safe_filename(filename):
        return jsonify({'success': False, 'error': '文件名不合法'}), 400
    filepath = os.path.join(STORAGE_DIR, filename)
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
    """删除指定XML文件（可选，为方便管理）"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '无效请求'}), 400
    filename = data.get('filename', '').strip()
    if not filename or not is_safe_filename(filename):
        return jsonify({'success': False, 'error': '文件名不合法'}), 400
    filepath = os.path.join(STORAGE_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'error': '文件不存在'}), 404
    try:
        os.remove(filepath)
        return jsonify({'success': True, 'message': f'已删除 {filename}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/local/load', methods=['POST'])
def local_load():
    """从用户指定的本地路径读取XAML文件"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '无效请求'}), 400
    file_path = data.get('path', '').strip()
    if not file_path:
        return jsonify({'success': False, 'error': '文件路径不能为空'}), 400
    # 安全性：只允许 .xaml 或 .xml 扩展名，并防止路径遍历
    if not (file_path.lower().endswith('.xaml') or file_path.lower().endswith('.xml')):
        return jsonify({'success': False, 'error': '只支持 .xaml 或 .xml 文件'}), 400
    if '..' in file_path or any(c in file_path for c in ['\\..', '/..']):
        return jsonify({'success': False, 'error': '非法路径'}), 400
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({'success': True, 'content': content, 'path': file_path})
    except FileNotFoundError:
        return jsonify({'success': False, 'error': '文件不存在'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/local/save', methods=['POST'])
def local_save():
    """将当前设计保存到用户指定的本地路径"""
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': '无效请求'}), 400
    file_path = data.get('path', '').strip()
    content = data.get('content', '')
    if not file_path:
        return jsonify({'success': False, 'error': '文件路径不能为空'}), 400
    if not (file_path.lower().endswith('.xaml') or file_path.lower().endswith('.xml')):
        return jsonify({'success': False, 'error': '只支持 .xaml 或 .xml 文件'}), 400
    if '..' in file_path or any(c in file_path for c in ['\\..', '/..']):
        return jsonify({'success': False, 'error': '非法路径'}), 400
    # 确保目录存在
    dir_name = os.path.dirname(file_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return jsonify({'success': True, 'message': f'已保存到 {file_path}', 'path': file_path})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)