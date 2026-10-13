export type ToastKind = 'info' | 'success' | 'error';

export type Toast = {
  id: number;
  message: string;
  kind: ToastKind;
};

class Toasts {
  list = $state<Toast[]>([]);
  #nextId = 1;

  push(message: string, kind: ToastKind = 'info', ms = 2600) {
    if (typeof window === 'undefined') return;
    const id = this.#nextId++;
    this.list = [...this.list, { id, message, kind }];
    setTimeout(() => this.dismiss(id), ms);
  }

  dismiss(id: number) {
    this.list = this.list.filter((t) => t.id !== id);
  }
}

export const toasts = new Toasts();

/** Show a transient popup notification. */
export function toast(message: string, kind: ToastKind = 'info') {
  toasts.push(message, kind);
}
