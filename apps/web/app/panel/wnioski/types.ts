export interface RejectModalState {
  open: boolean;
  id: string | null;
  kind: 'regular' | 'guest';
  reason: string;
  showError?: boolean;
}

export const STATUS_LABELS: Record<string, string> = {
  pending:   'Oczekujące',
  accepted:  'Zaakceptowane',
  rejected:  'Odrzucone',
  paid:      'Opłacone',
  completed: 'Zakończone',
};

export const PAGE_SIZES = [10, 20, 50, 100];
export const VALID_FILTERS = ['', 'pending', 'accepted', 'paid', 'rejected'];

export const FILTER_OPTIONS = [
  ['', 'Wszystkie'],
  ['pending', 'Oczekujące'],
  ['accepted', 'Oczekujące na płatność'],
  ['paid', 'Opłacone'],
  ['rejected', 'Odrzucone'],
] as const;
