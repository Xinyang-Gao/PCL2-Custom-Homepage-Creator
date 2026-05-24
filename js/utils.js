export class Utils {
    static showToast(msg, isErr = false) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.background = isErr ? '#ef4444' : '#4f46e5';
        toast.style.opacity = '1';
        setTimeout(() => toast.style.opacity = '0', 2000);
    }

    static escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    static escapeXml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        }).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    static escapeHtmlAttr(str) {
        if (!str) return '';
        return str.replace(/[&<>"]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            return m;
        }).replace(/'/g, '&apos;');
    }

    static isSafeUrl(url) {
        if (!url) return false;
        const lowerUrl = url.toLowerCase().trim();
        if (lowerUrl.startsWith('javascript:')) return false;
        if (lowerUrl.startsWith('data:') && !lowerUrl.startsWith('data:image/')) return false;
        return true;
    }
}