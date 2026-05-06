export const ECONSENT_SIGNATURE_EXTERNAL_VALUE = 'signature' as const;

export type EConsentModuleStatus = 'ACTIVE' | 'PENDING' | string;

export function isEConsentEnabledStatus(status: EConsentModuleStatus | null | undefined): boolean {
  return status === 'ACTIVE' || status === 'PENDING';
}

function readMetaContent(name: string): string | null {
  const el = document?.head?.querySelector?.(`meta[name="${name}"]`) as HTMLMetaElement | null;
  return el?.content ?? null;
}

/**
 * Best-effort read of study eConsent module status.
 *
 * Sources (first found wins):
 * - meta[name="oc-econsent-module-status"]
 * - window.OC_ECONSENT_MODULE_STATUS (string)
 * - window.parent.OC_ECONSENT_MODULE_STATUS (string) (if same-origin)
 */
export function getStudyEConsentModuleStatus(): string | null {
  const fromMeta = readMetaContent('oc-econsent-module-status');
  if (fromMeta) return fromMeta;

  const w = window as any;
  if (typeof w?.OC_ECONSENT_MODULE_STATUS === 'string') return w.OC_ECONSENT_MODULE_STATUS;

  try {
    const wp = (window as any)?.parent;
    if (wp && typeof wp.OC_ECONSENT_MODULE_STATUS === 'string') return wp.OC_ECONSENT_MODULE_STATUS;
  } catch {
    // cross-origin; ignore
  }

  return null;
}

/**
 * AC2 gating: allow adding new eConsent Signature items only if study module is ACTIVE/PENDING.
 * Existing signature rows should continue to render regardless.
 */
export function isEConsentSignatureItemTypeAllowed(): boolean {
  return isEConsentEnabledStatus(getStudyEConsentModuleStatus());
}

export function isEConsentSignatureRow(row: any): boolean {
  try {
    return row?.getValue?.('bind::oc:external') === ECONSENT_SIGNATURE_EXTERNAL_VALUE;
  } catch {
    return false;
  }
}

export function getEConsentSignatureCheckboxLabel(row: any): string {
  try {
    const list = row?.getList?.();
    const opt = list?.options?.at?.(0);
    return (opt?.get?.('label') ?? '') as string;
  } catch {
    return '';
  }
}

/**
 * Enforce the internal structure required for OpenClinica eConsent signature items.
 *
 * Notes:
 * - This intentionally mutates the Backbone row and its related choice list.
 * - Call this after row.linkUp() so that getList() is available.
 */
export function ensureEConsentSignatureStructure(row: any, checkboxLabel: string): void {
  if (!row) return;

  // Force type: select_multiple
  try {
    const typeDetail = row.get?.('type');
    typeDetail?.set?.('value', 'select_multiple');
  } catch {
    // ignore
  }

  // Force bind::oc:external = "signature"
  try {
    const external = row.get?.('bind::oc:external');
    external?.set?.('value', ECONSENT_SIGNATURE_EXTERNAL_VALUE);
  } catch {
    // ignore
  }

  // Force no item group
  try {
    const itemGroup = row.get?.('bind::oc:itemgroup');
    itemGroup?.set?.('value', '');
  } catch {
    // ignore
  }

  // Force exactly one response option with name "1"
  let list: any = null;
  try {
    list = row.getList?.();
  } catch {
    list = null;
  }
  if (!list?.options) return;

  const trimmed = (checkboxLabel ?? '').trim();
  const label = trimmed; // required field; empty is allowed temporarily but should fail UI validation

  list.options.reset([{label, name: '1'}]);
  const opt = list.options.at?.(0);
  opt?.set?.('name', '1');
  opt?.set?.('label', label);
}

