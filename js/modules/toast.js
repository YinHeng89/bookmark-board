/**
 * Toast 通知系统模块
 * 负责显示临时提示消息
 */

class ToastManager {
  constructor() {
    this.currentToast = null;
  }

  /**
   * 显示提示消息
   * @param {string} message - 提示内容
   * @param {number} duration - 显示时长（毫秒），默认 3000ms
   */
  show(message, duration = 3000) {
    // 移除已存在的 toast
    if (this.currentToast) {
      this.currentToast.remove();
      this.currentToast = null;
    }

    // 创建新 toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <i class="fa fa-info-circle toast-icon"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);
    this.currentToast = toast;

    // 自动消失
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        toast.remove();
        if (this.currentToast === toast) {
          this.currentToast = null;
        }
      }, 300);
    }, duration);
  }
}

// 导出单例
const toastManager = new ToastManager();
