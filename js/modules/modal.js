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
   */
  show({ title = '', message = '', input = false, defaultValue = '', onConfirm, onCancel }) {
    // 设置内容，使用 I18n 翻译或降级
    const defaultTitle = I18n.t('modal_default_title');
    this.modalTitle.textContent = title || defaultTitle;
    this.modalMessage.textContent = message;

    // 配置按钮文字
    if (this.modalCancel) this.modalCancel.textContent = I18n.t('cancel');
    if (this.modalOk) this.modalOk.textContent = I18n.t('confirm');

    // 配置输入框
    if (input) {
      this.modalInput.classList.remove('hidden');
      this.modalInput.value = defaultValue || '';
      setTimeout(() => this.modalInput.focus(), 100);
      
      this.modalInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          this.modalOk.click();
        }
      };
    } else {
      this.modalInput.classList.add('hidden');
      this.modalInput.onkeydown = null;
    }

    this.modal.classList.add('show');

    this.modalOk.onclick = () => {
      if (input) {
        onConfirm?.(this.modalInput.value);
      } else {
        onConfirm?.();
      }
      this.close();
    };

    this.modalCancel.onclick = () => {
      onCancel?.();
      this.close();
    };

    this._escHandler = (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
        this.close();
      }
    };
    document.addEventListener('keydown', this._escHandler);
  }

  close() {
    this.modal.classList.remove('show');
    this.modalOk.onclick = null;
    this.modalCancel.onclick = null;
    
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  }
}

// 导出单例
const modalManager = new ModalManager();
