import type {
  ForwardRuleDraft,
  HostDraft,
  HostView,
  JumpHostConfig,
  TunnelAuthType,
} from '../shared/types';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Renderer failed to initialize: missing ${selector}`);
  }
  return element;
}

function requireIn<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Renderer failed to initialize: missing ${selector} inside container`);
  }
  return element;
}

const hostDialog = requireElement<HTMLDialogElement>('#host-dialog');
const hostDialogTitle = requireElement<HTMLElement>('#host-dialog-title');
const openAddHostButton = requireElement<HTMLButtonElement>('#open-add-host-btn');
const closeHostDialogButton = requireElement<HTMLButtonElement>('#close-host-dialog-btn');
const cancelHostDialogButton = requireElement<HTMLButtonElement>('#cancel-host-dialog-btn');
const saveHostButton = requireElement<HTMLButtonElement>('#save-host-btn');
const form = requireElement<HTMLFormElement>('#tunnel-form');
const hostIdInput = requireElement<HTMLInputElement>('#host-id');
const nameInput = requireElement<HTMLInputElement>('#name');
const sshHostInput = requireElement<HTMLInputElement>('#ssh-host');
const sshPortInput = requireElement<HTMLInputElement>('#ssh-port');
const usernameInput = requireElement<HTMLInputElement>('#username');
const authTypeSelect = requireElement<HTMLSelectElement>('#auth-type');
const passwordInput = requireElement<HTMLInputElement>('#password');
const privateKeyInput = requireElement<HTMLTextAreaElement>('#private-key');
const passphraseInput = requireElement<HTMLInputElement>('#passphrase');
const passwordRow = requireElement<HTMLElement>('#password-row');
const privateKeyRow = requireElement<HTMLElement>('#private-key-row');
const passphraseRow = requireElement<HTMLElement>('#passphrase-row');
const importPrivateKeyButton = requireElement<HTMLButtonElement>('#import-private-key-btn');
const useJumpHostInput = requireElement<HTMLInputElement>('#use-jump-host');
const jumpHostSection = requireElement<HTMLElement>('#jump-host-section');
const jumpSshHostInput = requireElement<HTMLInputElement>('#jump-ssh-host');
const jumpSshPortInput = requireElement<HTMLInputElement>('#jump-ssh-port');
const jumpUsernameInput = requireElement<HTMLInputElement>('#jump-username');
const jumpAuthTypeSelect = requireElement<HTMLSelectElement>('#jump-auth-type');
const jumpPasswordInput = requireElement<HTMLInputElement>('#jump-password');
const jumpPrivateKeyInput = requireElement<HTMLTextAreaElement>('#jump-private-key');
const jumpPassphraseInput = requireElement<HTMLInputElement>('#jump-passphrase');
const jumpPasswordRow = requireElement<HTMLElement>('#jump-password-row');
const jumpPrivateKeyRow = requireElement<HTMLElement>('#jump-private-key-row');
const jumpPassphraseRow = requireElement<HTMLElement>('#jump-passphrase-row');
const importJumpPrivateKeyButton = requireElement<HTMLButtonElement>('#import-jump-private-key-btn');
const forwardList = requireElement<HTMLDivElement>('#forward-list');
const addForwardButton = requireElement<HTMLButtonElement>('#add-forward-btn');
const tableBody = requireElement<HTMLTableSectionElement>('#tunnel-table-body');
const resetButton = requireElement<HTMLButtonElement>('#reset-btn');
const messageElement = requireElement<HTMLParagraphElement>('#message');

const labelClass = 'field field-xs';
const inputClass = 'input';
const smallPrimaryButtonClass = 'btn btn-primary btn-sm';
const smallSecondaryButtonClass = 'btn btn-secondary btn-sm';
const smallDangerButtonClass = 'btn btn-danger btn-sm';

type ButtonIcon =
  | 'plus'
  | 'save'
  | 'refresh'
  | 'close'
  | 'upload'
  | 'edit'
  | 'delete'
  | 'play'
  | 'stop';

const BUTTON_ICON_SVG: Record<ButtonIcon, string> = {
  plus: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 5v14"></path>
      <path d="M5 12h14"></path>
    </svg>
  `,
  save: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 4h11l3 3v13H4V4z"></path>
      <path d="M8 4v5h8V4"></path>
      <path d="M8 20v-6h8v6"></path>
    </svg>
  `,
  refresh: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 11a8 8 0 0 0-14.85-4"></path>
      <path d="M4 4v4h4"></path>
      <path d="M4 13a8 8 0 0 0 14.85 4"></path>
      <path d="M20 20v-4h-4"></path>
    </svg>
  `,
  close: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6L6 18"></path>
      <path d="M6 6l12 12"></path>
    </svg>
  `,
  upload: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 15V5"></path>
      <path d="M9 8l3-3l3 3"></path>
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"></path>
    </svg>
  `,
  edit: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 20l4-1l8-8a2 2 0 0 0-4-4l-8 8l-1 4"></path>
      <path d="M14 7l4 4"></path>
    </svg>
  `,
  delete: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 7h16"></path>
      <path d="M10 11v6"></path>
      <path d="M14 11v6"></path>
      <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"></path>
      <path d="M9 7V4h6v3"></path>
    </svg>
  `,
  play: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 5v14l11-7z"></path>
    </svg>
  `,
  stop: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="6" y="6" width="12" height="12"></rect>
    </svg>
  `,
};

let hosts: HostView[] = [];
let hostDialogMode: 'create' | 'edit' = 'create';

function buttonLabel(icon: ButtonIcon, text: string): string {
  return `<span class="btn-icon" aria-hidden="true">${BUTTON_ICON_SVG[icon]}</span><span>${text}</span>`;
}

function iconOnly(icon: ButtonIcon): string {
  return `<span class="btn-icon" aria-hidden="true">${BUTTON_ICON_SVG[icon]}</span>`;
}

function applyStaticButtonIcons(): void {
  openAddHostButton.innerHTML = buttonLabel('plus', 'Add Host');
  closeHostDialogButton.innerHTML = iconOnly('close');
  importPrivateKeyButton.innerHTML = buttonLabel('upload', 'Import');
  importJumpPrivateKeyButton.innerHTML = buttonLabel('upload', 'Import');
  addForwardButton.innerHTML = buttonLabel('plus', 'Add Rule');
  resetButton.innerHTML = buttonLabel('refresh', 'Reset');
  cancelHostDialogButton.innerHTML = buttonLabel('close', 'Cancel');
}

function setMessage(text: string, level: 'default' | 'success' | 'error' = 'default'): void {
  messageElement.textContent = text;
  messageElement.classList.remove('message-default', 'message-success', 'message-error');

  if (level === 'success') {
    messageElement.classList.add('message-success');
    return;
  }

  if (level === 'error') {
    messageElement.classList.add('message-error');
    return;
  }

  messageElement.classList.add('message-default');
}

function openHostDialog(mode: 'create' | 'edit', host?: HostView): void {
  hostDialogMode = mode;

  if (mode === 'create') {
    hostDialogTitle.textContent = 'Add Host';
    saveHostButton.innerHTML = buttonLabel('save', 'Save Host');
    resetForm();
    setMessage('');
  } else {
    if (!host) {
      throw new Error('Missing host data for edit mode.');
    }
    hostDialogTitle.textContent = 'Edit Host';
    saveHostButton.innerHTML = buttonLabel('save', 'Save Changes');
    populateForm(host);
    setMessage('');
  }

  if (!hostDialog.open) {
    hostDialog.showModal();
  }

  void Promise.resolve().then(() => {
    nameInput.focus();
  });
}

function closeHostDialog(): void {
  if (hostDialog.open) {
    hostDialog.close();
  }
}

function resetHostDialogState(): void {
  hostDialogMode = 'create';
  hostDialogTitle.textContent = 'Add Host';
  saveHostButton.innerHTML = buttonLabel('save', 'Save Host');
  resetForm();
  setMessage('');
}

function toggleAuthFields(): void {
  const authType = authTypeSelect.value as TunnelAuthType;

  if (authType === 'password') {
    passwordRow.classList.remove('hidden');
    privateKeyRow.classList.add('hidden');
    passphraseRow.classList.add('hidden');
  } else {
    passwordRow.classList.add('hidden');
    privateKeyRow.classList.remove('hidden');
    passphraseRow.classList.remove('hidden');
  }
}

function toggleJumpAuthFields(): void {
  const authType = jumpAuthTypeSelect.value as TunnelAuthType;

  if (authType === 'password') {
    jumpPasswordRow.classList.remove('hidden');
    jumpPrivateKeyRow.classList.add('hidden');
    jumpPassphraseRow.classList.add('hidden');
  } else {
    jumpPasswordRow.classList.add('hidden');
    jumpPrivateKeyRow.classList.remove('hidden');
    jumpPassphraseRow.classList.remove('hidden');
  }
}

function toggleJumpSection(): void {
  if (!useJumpHostInput.checked) {
    jumpHostSection.classList.add('hidden');
    return;
  }

  jumpHostSection.classList.remove('hidden');
  toggleJumpAuthFields();
}

function parsePort(value: string, label: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${label} must be an integer between 1 and 65535`);
  }
  return port;
}

function getFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || filePath;
}

function getForwardRows(): HTMLDivElement[] {
  return Array.from(forwardList.querySelectorAll<HTMLDivElement>('.forward-row'));
}

function syncForwardRemoveButtons(): void {
  const rows = getForwardRows();
  const disabled = rows.length <= 1;

  for (const row of rows) {
    const removeButton = requireIn<HTMLButtonElement>(row, '.forward-remove');
    removeButton.disabled = disabled;
  }
}

function createForwardRow(initial?: Partial<ForwardRuleDraft>): void {
  const row = document.createElement('div');
  row.className = 'forward-row';

  if (initial?.id) {
    row.dataset.forwardId = initial.id;
  }

  row.innerHTML = `
    <label class="forward-local-host ${labelClass}">
      Local Host
      <input class="forward-input-local-host ${inputClass}" type="text" required />
    </label>
    <label class="forward-local-port ${labelClass}">
      Local Port
      <input class="forward-input-local-port ${inputClass}" type="number" min="1" max="65535" required />
    </label>
    <label class="forward-remote-host ${labelClass}">
      Remote Host
      <input class="forward-input-remote-host ${inputClass}" type="text" required />
    </label>
    <label class="forward-remote-port ${labelClass}">
      Remote Port
      <input class="forward-input-remote-port ${inputClass}" type="number" min="1" max="65535" required />
    </label>
    <label class="forward-auto">
      <input class="forward-input-auto-start checkbox" type="checkbox" />
      Auto Start
    </label>
    <button class="forward-remove ${smallDangerButtonClass}" type="button">Delete Rule</button>
  `;

  const localHostInput = requireIn<HTMLInputElement>(row, '.forward-input-local-host');
  const localPortInput = requireIn<HTMLInputElement>(row, '.forward-input-local-port');
  const remoteHostInput = requireIn<HTMLInputElement>(row, '.forward-input-remote-host');
  const remotePortInput = requireIn<HTMLInputElement>(row, '.forward-input-remote-port');
  const autoStartInput = requireIn<HTMLInputElement>(row, '.forward-input-auto-start');
  const removeButton = requireIn<HTMLButtonElement>(row, '.forward-remove');
  removeButton.innerHTML = buttonLabel('delete', 'Delete Rule');

  localHostInput.value = initial?.localHost ?? '127.0.0.1';
  localPortInput.value =
    typeof initial?.localPort === 'number' && initial.localPort > 0 ? String(initial.localPort) : '';
  remoteHostInput.value = initial?.remoteHost ?? '127.0.0.1';
  remotePortInput.value =
    typeof initial?.remotePort === 'number' && initial.remotePort > 0
      ? String(initial.remotePort)
      : '';
  autoStartInput.checked = Boolean(initial?.autoStart);

  removeButton.addEventListener('click', () => {
    row.remove();
    if (getForwardRows().length === 0) {
      createForwardRow();
    } else {
      syncForwardRemoveButtons();
    }
  });

  forwardList.appendChild(row);
  syncForwardRemoveButtons();
}

function collectForwardsFromForm(): ForwardRuleDraft[] {
  const rows = getForwardRows();
  if (rows.length === 0) {
    throw new Error('At least one forwarding rule is required');
  }

  return rows.map((row, index) => {
    const localHostInput = requireIn<HTMLInputElement>(row, '.forward-input-local-host');
    const localPortInput = requireIn<HTMLInputElement>(row, '.forward-input-local-port');
    const remoteHostInput = requireIn<HTMLInputElement>(row, '.forward-input-remote-host');
    const remotePortInput = requireIn<HTMLInputElement>(row, '.forward-input-remote-port');
    const autoStartInput = requireIn<HTMLInputElement>(row, '.forward-input-auto-start');

    const localHost = localHostInput.value.trim();
    const remoteHost = remoteHostInput.value.trim();

    if (!localHost) {
      throw new Error(`Rule ${index + 1}: Local Host is required`);
    }
    if (!remoteHost) {
      throw new Error(`Rule ${index + 1}: Remote Host is required`);
    }

    return {
      id: row.dataset.forwardId?.trim() || undefined,
      localHost,
      localPort: parsePort(localPortInput.value, `Rule ${index + 1} Local Port`),
      remoteHost,
      remotePort: parsePort(remotePortInput.value, `Rule ${index + 1} Remote Port`),
      autoStart: autoStartInput.checked,
    };
  });
}

function collectJumpHostDraft(): JumpHostConfig | undefined {
  if (!useJumpHostInput.checked) {
    return undefined;
  }

  const authType = jumpAuthTypeSelect.value as TunnelAuthType;
  const jumpHost: JumpHostConfig = {
    sshHost: jumpSshHostInput.value.trim(),
    sshPort: parsePort(jumpSshPortInput.value, 'Jump SSH Port'),
    username: jumpUsernameInput.value.trim(),
    authType,
    password: jumpPasswordInput.value,
    privateKey: jumpPrivateKeyInput.value,
    passphrase: jumpPassphraseInput.value,
  };

  if (!jumpHost.sshHost) {
    throw new Error('Jump SSH Host is required');
  }
  if (!jumpHost.username) {
    throw new Error('Jump Username is required');
  }

  if (authType === 'password') {
    if (!jumpHost.password) {
      throw new Error('Jump Password is required for password auth');
    }
    jumpHost.privateKey = undefined;
    jumpHost.passphrase = undefined;
  } else {
    if (!(jumpHost.privateKey ?? '').trim()) {
      throw new Error('Jump Private Key is required for private key auth');
    }
    jumpHost.password = undefined;
  }

  return jumpHost;
}

function collectDraftFromForm(): HostDraft {
  const authType = authTypeSelect.value as TunnelAuthType;

  const draft: HostDraft = {
    id: hostIdInput.value.trim() || undefined,
    name: nameInput.value.trim(),
    sshHost: sshHostInput.value.trim(),
    sshPort: parsePort(sshPortInput.value, 'SSH Port'),
    username: usernameInput.value.trim(),
    authType,
    password: passwordInput.value,
    privateKey: privateKeyInput.value,
    passphrase: passphraseInput.value,
    jumpHost: collectJumpHostDraft(),
    forwards: collectForwardsFromForm(),
  };

  if (!draft.name) {
    throw new Error('Name is required');
  }
  if (!draft.sshHost) {
    throw new Error('SSH Host is required');
  }
  if (!draft.username) {
    throw new Error('Username is required');
  }

  if (authType === 'password' && !draft.password) {
    throw new Error('Password is required for password auth');
  }

  if (authType === 'privateKey' && !(draft.privateKey ?? '').trim()) {
    throw new Error('Private key is required for private key auth');
  }

  return draft;
}

function resetForm(): void {
  form.reset();
  hostIdInput.value = '';
  sshPortInput.value = '22';
  authTypeSelect.value = 'privateKey';
  passwordInput.value = '';
  privateKeyInput.value = '';
  passphraseInput.value = '';
  useJumpHostInput.checked = false;
  jumpSshHostInput.value = '';
  jumpSshPortInput.value = '22';
  jumpUsernameInput.value = '';
  jumpAuthTypeSelect.value = 'privateKey';
  jumpPasswordInput.value = '';
  jumpPrivateKeyInput.value = '';
  jumpPassphraseInput.value = '';
  forwardList.innerHTML = '';
  createForwardRow();
  toggleAuthFields();
  toggleJumpSection();
}

function createStatusPill(status: string, error?: string): HTMLSpanElement {
  const pill = document.createElement('span');
  pill.className = 'status-pill';

  if (status === 'running') {
    pill.classList.add('status-running');
  } else if (status === 'error') {
    pill.classList.add('status-error');
  } else if (status === 'starting' || status === 'stopping') {
    pill.classList.add('status-transition');
  } else {
    pill.classList.add('status-stopped');
  }

  pill.textContent = status;
  if (error) {
    pill.title = error;
  }

  return pill;
}

function renderGroupRow(host: HostView): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.className = 'group-row';

  const cell = document.createElement('td');
  cell.colSpan = 6;
  cell.className = 'group-cell';

  const head = document.createElement('div');
  head.className = 'group-head';

  const meta = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'group-title';
  title.textContent = host.name;

  const desc = document.createElement('div');
  desc.className = 'group-desc';
  const jumpText = host.jumpHost
    ? ` · via ${host.jumpHost.username}@${host.jumpHost.sshHost}:${host.jumpHost.sshPort}`
    : '';
  desc.textContent = `${host.username}@${host.sshHost}:${host.sshPort} · ${
    host.authType === 'password' ? 'Password' : 'Private Key'
  }${jumpText}`;

  meta.append(title, desc);

  const actions = document.createElement('div');
  actions.className = 'row-actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = smallSecondaryButtonClass;
  editButton.innerHTML = buttonLabel('edit', 'Edit Host');
  editButton.addEventListener('click', () => {
    openHostDialog('edit', host);
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = smallDangerButtonClass;
  deleteButton.innerHTML = buttonLabel('delete', 'Delete Host');
  deleteButton.addEventListener('click', () => {
    void runAction(async () => {
      const ok = await window.tunnelApi.confirmAction({
        title: 'Delete Host',
        message: `Delete host "${host.name}"?`,
        detail: 'All forwarding rules under this host will be deleted.',
        kind: 'warning',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
      });
      if (!ok) {
        return;
      }

      await window.tunnelApi.deleteHost(host.id);
      if (hostDialog.open && hostIdInput.value === host.id) {
        closeHostDialog();
      }
      setMessage(`Host ${host.name} deleted`, 'success');
    });
  });

  actions.append(editButton, deleteButton);
  head.append(meta, actions);
  cell.appendChild(head);
  row.appendChild(cell);

  return row;
}

function renderRulesHeaderRow(): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.className = 'host-rules-head';

  const labels = ['Rule', 'Local', 'Remote', 'Auto Start', 'Status', 'Actions'];
  for (const label of labels) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    row.appendChild(cell);
  }

  return row;
}

function renderHostEmptyRulesRow(): HTMLTableRowElement {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 6;
  cell.className = 'table-empty';
  cell.textContent = 'No rules for this host';
  row.appendChild(cell);
  return row;
}

function renderForwardRow(host: HostView, index: number): HTMLTableRowElement {
  const forward = host.forwards[index];
  const row = document.createElement('tr');
  row.className = 'data-row';

  const ruleCell = document.createElement('td');
  ruleCell.className = 'table-cell';
  ruleCell.textContent = `Rule ${index + 1}`;

  const localCell = document.createElement('td');
  localCell.className = 'table-cell';
  localCell.textContent = `${forward.localHost}:${forward.localPort}`;

  const remoteCell = document.createElement('td');
  remoteCell.className = 'table-cell';
  remoteCell.textContent = `${forward.remoteHost}:${forward.remotePort}`;

  const autoStartCell = document.createElement('td');
  autoStartCell.className = 'table-cell';
  autoStartCell.textContent = forward.autoStart ? 'Yes' : 'No';

  const statusCell = document.createElement('td');
  statusCell.className = 'table-cell';
  statusCell.appendChild(createStatusPill(forward.status, forward.error));

  const actionsCell = document.createElement('td');
  actionsCell.className = 'table-cell';
  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'row-actions';

  const startButton = document.createElement('button');
  startButton.type = 'button';
  startButton.className = smallPrimaryButtonClass;
  startButton.innerHTML = buttonLabel('play', 'Start');
  startButton.disabled = forward.status === 'running' || forward.status === 'starting';
  startButton.addEventListener('click', () => {
    void runAction(async () => {
      await window.tunnelApi.startForward(forward.id);
      setMessage(`Rule ${index + 1} is starting...`);
    });
  });

  const stopButton = document.createElement('button');
  stopButton.type = 'button';
  stopButton.className = smallSecondaryButtonClass;
  stopButton.innerHTML = buttonLabel('stop', 'Stop');
  stopButton.disabled = forward.status === 'stopped' || forward.status === 'stopping';
  stopButton.addEventListener('click', () => {
    void runAction(async () => {
      await window.tunnelApi.stopForward(forward.id);
      setMessage(`Rule ${index + 1} stopped`, 'success');
    });
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = smallDangerButtonClass;
  deleteButton.innerHTML = buttonLabel('delete', 'Delete');
  deleteButton.addEventListener('click', () => {
    void runAction(async () => {
      const ok = await window.tunnelApi.confirmAction({
        title: 'Delete Rule',
        message: `Delete Rule ${index + 1} under "${host.name}"?`,
        kind: 'warning',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
      });
      if (!ok) {
        return;
      }

      await window.tunnelApi.deleteForward(host.id, forward.id);
      setMessage(`Rule ${index + 1} deleted`, 'success');
      if (hostDialog.open && hostIdInput.value === host.id) {
        const latest = await window.tunnelApi.listHosts();
        const latestHost = latest.find((item) => item.id === host.id);
        if (latestHost) {
          populateForm(latestHost);
        } else {
          resetForm();
        }
        hosts = latest;
        renderTable();
      }
    });
  });

  actionsWrap.append(startButton, stopButton, deleteButton);
  actionsCell.appendChild(actionsWrap);

  row.append(ruleCell, localCell, remoteCell, autoStartCell, statusCell, actionsCell);
  return row;
}

function renderTable(): void {
  tableBody.innerHTML = '';

  if (hosts.length === 0) {
    const emptyRow = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'table-empty';
    cell.textContent = 'No host configurations yet';
    emptyRow.appendChild(cell);
    tableBody.appendChild(emptyRow);
    return;
  }

  for (const host of hosts) {
    tableBody.appendChild(renderGroupRow(host));
    tableBody.appendChild(renderRulesHeaderRow());

    if (host.forwards.length === 0) {
      tableBody.appendChild(renderHostEmptyRulesRow());
      continue;
    }

    for (let index = 0; index < host.forwards.length; index += 1) {
      tableBody.appendChild(renderForwardRow(host, index));
    }
  }
}

function populateForm(host: HostView): void {
  hostIdInput.value = host.id;
  nameInput.value = host.name;
  sshHostInput.value = host.sshHost;
  sshPortInput.value = String(host.sshPort);
  usernameInput.value = host.username;
  authTypeSelect.value = host.authType;
  passwordInput.value = host.password ?? '';
  privateKeyInput.value = host.privateKey ?? '';
  passphraseInput.value = host.passphrase ?? '';
  useJumpHostInput.checked = Boolean(host.jumpHost);
  jumpSshHostInput.value = host.jumpHost?.sshHost ?? '';
  jumpSshPortInput.value = host.jumpHost?.sshPort ? String(host.jumpHost.sshPort) : '22';
  jumpUsernameInput.value = host.jumpHost?.username ?? '';
  jumpAuthTypeSelect.value = host.jumpHost?.authType ?? 'privateKey';
  jumpPasswordInput.value = host.jumpHost?.password ?? '';
  jumpPrivateKeyInput.value = host.jumpHost?.privateKey ?? '';
  jumpPassphraseInput.value = host.jumpHost?.passphrase ?? '';

  forwardList.innerHTML = '';
  for (const forward of host.forwards) {
    createForwardRow(forward);
  }
  if (host.forwards.length === 0) {
    createForwardRow();
  }

  toggleAuthFields();
  toggleJumpSection();
}

async function refreshHosts(): Promise<void> {
  hosts = await window.tunnelApi.listHosts();
  renderTable();
}

async function runAction(action: () => Promise<void>): Promise<void> {
  try {
    await action();
    await refreshHosts();
  } catch (error) {
    setMessage(error instanceof Error ? error.message : String(error), 'error');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void runAction(async () => {
    const draft = collectDraftFromForm();
    await window.tunnelApi.saveHost(draft);
    closeHostDialog();
  });
});

openAddHostButton.addEventListener('click', () => {
  openHostDialog('create');
});

closeHostDialogButton.addEventListener('click', () => {
  closeHostDialog();
});

cancelHostDialogButton.addEventListener('click', () => {
  closeHostDialog();
});

authTypeSelect.addEventListener('change', () => {
  toggleAuthFields();
});

useJumpHostInput.addEventListener('change', () => {
  toggleJumpSection();
});

jumpAuthTypeSelect.addEventListener('change', () => {
  toggleJumpAuthFields();
});

addForwardButton.addEventListener('click', () => {
  createForwardRow();
});

importPrivateKeyButton.addEventListener('click', () => {
  void runAction(async () => {
    const result = await window.tunnelApi.importPrivateKey();
    if (!result) {
      return;
    }

    privateKeyInput.value = result.content;
    setMessage(`Imported private key file: ${getFileName(result.path)}`, 'success');
  });
});

importJumpPrivateKeyButton.addEventListener('click', () => {
  void runAction(async () => {
    const result = await window.tunnelApi.importPrivateKey();
    if (!result) {
      return;
    }

    jumpPrivateKeyInput.value = result.content;
    setMessage(`Imported jump private key file: ${getFileName(result.path)}`, 'success');
  });
});

resetButton.addEventListener('click', () => {
  if (hostDialogMode === 'edit') {
    const currentHostId = hostIdInput.value.trim();
    const currentHost = hosts.find((item) => item.id === currentHostId);
    if (currentHost) {
      populateForm(currentHost);
      setMessage('Reverted to saved host values');
      return;
    }
  }

  resetForm();
  setMessage('Form reset');
});

hostDialog.addEventListener('click', (event) => {
  if (event.target === hostDialog) {
    closeHostDialog();
  }
});

hostDialog.addEventListener('close', () => {
  resetHostDialogState();
});

const unsubscribe = window.tunnelApi.onStatusChanged(() => {
  void refreshHosts();
});

window.addEventListener('beforeunload', () => {
  unsubscribe();
});

applyStaticButtonIcons();
resetHostDialogState();
void refreshHosts();
