import { classifyBp, BP_STYLE } from '../../utils/blood-pressure';
import { useT } from '../../i18n';
import type { MessageKey } from '../../i18n/messages';

/** A reading's category as a labelled chip. The words carry the meaning; the colour only backs them up. */
export function BpCategoryChip({ systolic, diastolic }: { systolic: number; diastolic: number }) {
  const { t } = useT();
  const category = classifyBp(systolic, diastolic);
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${BP_STYLE[category].chip}`}>
      {t(`bp.cat.${category}` as MessageKey)}
    </span>
  );
}
