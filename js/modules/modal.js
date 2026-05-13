/**
 * 弹窗系统模块
 * 负责管理确认框、输入框等模态对话框
 */

class ModalManager {
  constructor() {
    this.modal = document.getElementById('modal');
    this.modalTitle = document.getElementById('modalTitle');
    this.modalMessage = document.getElementById('modalMessage');
    this.modalInput = document.getElementById('modalInput');
    this.modalCancel = document.getElementById('modalCancel');
    this.modalOk = document.getElementById('modalOk');
    
    this._escHandler = null;
  }

  /**
   * 显示模态对话框
   * @param {Object} options - 配置选项
   * @param {string} options.title - 标题
   * @param {string} options.message - 消息内容
   * @param {boolean} options.input - 是否显示输入框
   * @param {string} options.defaultValue - 输入框默认值
   * @param {Function} options.onConfirm - 确认回调
   * @param {Function} options.onCancel - 取消回调
   */
  show({ title = '提示', message = '', input = false, defaultValue = '', onConfirm, onCancel }) {
    // 设置内容
    this.modalTitle.textContent = title;
    this.modalMessage.textContent = message;

    // 配置输入框
    if (input) {
      this.modalInput.classList.remove('hidden');
      this.modalInput.value = defaultValue || '';
      setTimeout(() => this.modalInput.focus(), 100);
      
      // 回车键确认
      this.modalInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          this.modalOk.click();
        }
      };
    } else {
      this.modalInput.classList.add('hidden');
      this.modalInput.onkeydown = null;
    }

    // 显示弹窗
    this.modal.classList.add('show');

    // 绑定确认按钮
    this.modalOk.onclick = () => {
      if (input) {
        onConfirm?.(this.modalInput.value);
      } else {
        onConfirm?.();
      }
      this.close();
    };

    // 绑定取消按钮
    this.modalCancel.onclick = () => {
      onCancel?.();
      this.close();
    };

    // 绑定 ESC 键关闭
    this._escHandler = (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
        this.close();
      }
    };
    document.addEventListener('keydown', this._escHandler);
  }

  /**
   * 关闭弹窗
   */
  close() {
    this.modal.classList.remove('show');
    this.modalOk.onclick = null;
    this.modalCancel.onclick = null;
    
    // 移除 ESC 监听
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  }
}

// 导出单例
const modalManager = new ModalManager();
