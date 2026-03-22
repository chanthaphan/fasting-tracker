/**
 * Scientific estimates of metabolic markers during fasting.
 * Based on published research on intermittent and extended fasting.
 *
 * References:
 * - Anton et al. (2018) "Flipping the Metabolic Switch" - Obesity
 * - de Cabo & Mattson (2019) "Effects of IF on Health" - NEJM
 * - Longo & Mattson (2014) "Fasting: Molecular Mechanisms" - Cell Metabolism
 * - Cahill (1970) "Starvation in Man" - NEJM (ketone/glucose curves)
 */

export interface FastingInsight {
  label: string;
  value: string;
  detail: string;
  icon: string;
}

export function getFastingInsights(elapsedMs: number): FastingInsight[] {
  const hours = elapsedMs / 3_600_000;

  return [
    getInsulinInsight(hours),
    getKetoneInsight(hours),
    getGlucoseInsight(hours),
    getGrowthHormoneInsight(hours),
    getAutophagyInsight(hours),
    getFatBurnInsight(hours),
  ];
}

function getInsulinInsight(hours: number): FastingInsight {
  // Insulin drops ~50% by 12h, ~70-80% by 24h, baseline low by 36h+
  let value: string;
  let detail: string;

  if (hours < 4) {
    value = 'Elevated';
    detail = 'Insulin high from recent meal, storing energy';
  } else if (hours < 12) {
    value = 'Dropping';
    detail = 'Insulin declining, body shifting to stored fuel';
  } else if (hours < 24) {
    value = 'Low';
    detail = 'Insulin ~50% below fed state, fat cells releasing energy';
  } else if (hours < 48) {
    value = 'Very Low';
    detail = 'Insulin at baseline, maximal fat mobilization';
  } else {
    value = 'Minimal';
    detail = 'Insulin at fasting baseline, sustained fat oxidation';
  }

  return { label: 'Insulin', value, detail, icon: '💉' };
}

function getKetoneInsight(hours: number): FastingInsight {
  // Blood ketones: ~0.1-0.2 mM fed, ~0.5 mM at 12-16h, ~1-2 mM at 24h, ~2-5 mM at 48-72h
  let value: string;
  let detail: string;

  if (hours < 8) {
    value = '~0.1-0.2 mM';
    detail = 'Baseline level, glucose is primary fuel';
  } else if (hours < 16) {
    value = '~0.2-0.5 mM';
    detail = 'Ketone production starting as glycogen depletes';
  } else if (hours < 24) {
    value = '~0.5-1.5 mM';
    detail = 'Nutritional ketosis, brain using ketones for ~25% of energy';
  } else if (hours < 48) {
    value = '~1.5-3.0 mM';
    detail = 'Deep ketosis, brain using ketones for ~50-60% of energy';
  } else {
    value = '~3.0-5.0 mM';
    detail = 'Maximal ketosis, brain relying heavily on ketones';
  }

  return { label: 'Ketones (BHB)', value, detail, icon: '🔥' };
}

function getGlucoseInsight(hours: number): FastingInsight {
  // Blood glucose: ~90-100 mg/dL fed, ~80-90 at 12h, ~70-80 at 24h, ~65-75 at 48h+
  let value: string;
  let detail: string;

  if (hours < 4) {
    value = '~90-100 mg/dL';
    detail = 'Normal post-meal blood glucose level';
  } else if (hours < 12) {
    value = '~85-95 mg/dL';
    detail = 'Liver glycogen maintaining blood sugar';
  } else if (hours < 24) {
    value = '~75-85 mg/dL';
    detail = 'Glycogen depleting, gluconeogenesis starting';
  } else if (hours < 48) {
    value = '~70-80 mg/dL';
    detail = 'Stable via gluconeogenesis from amino acids & glycerol';
  } else {
    value = '~65-75 mg/dL';
    detail = 'Maintained at lower level, body adapted to ketones';
  }

  return { label: 'Blood Glucose', value, detail, icon: '🩸' };
}

function getGrowthHormoneInsight(hours: number): FastingInsight {
  // GH increases ~300% at 24h, up to ~500% at 48h (Hartman et al. 1992)
  let value: string;
  let detail: string;

  if (hours < 12) {
    value = 'Baseline';
    detail = 'Normal pulsatile secretion pattern';
  } else if (hours < 24) {
    value = '~2x baseline';
    detail = 'Increasing to preserve muscle during fasting';
  } else if (hours < 48) {
    value = '~3x baseline';
    detail = 'Significant elevation protecting lean mass';
  } else {
    value = '~5x baseline';
    detail = 'Peak levels, strong muscle preservation signal';
  }

  return { label: 'Growth Hormone', value, detail, icon: '💪' };
}

function getAutophagyInsight(hours: number): FastingInsight {
  // Autophagy markers increase significantly after 24-48h in humans
  let value: string;
  let detail: string;

  if (hours < 16) {
    value = 'Minimal';
    detail = 'Cellular cleanup at normal baseline rate';
  } else if (hours < 24) {
    value = 'Activating';
    detail = 'AMPK rising, mTOR suppressed, autophagy genes upregulated';
  } else if (hours < 48) {
    value = 'Active';
    detail = 'Cells recycling damaged proteins and organelles';
  } else {
    value = 'Elevated';
    detail = 'Significant cellular renewal and damaged component removal';
  }

  return { label: 'Autophagy', value, detail, icon: '♻️' };
}

function getFatBurnInsight(hours: number): FastingInsight {
  // Fat oxidation rate increases as fasting progresses
  let value: string;
  let detail: string;

  if (hours < 4) {
    value = '~40% of fuel';
    detail = 'Mixed fuel use, carbs still primary source';
  } else if (hours < 12) {
    value = '~60% of fuel';
    detail = 'Increasing reliance on stored fat for energy';
  } else if (hours < 24) {
    value = '~80% of fuel';
    detail = 'Fat is primary fuel source, glycogen nearly depleted';
  } else {
    value = '~90%+ of fuel';
    detail = 'Almost entirely fat-fueled via ketones and free fatty acids';
  }

  return { label: 'Fat Oxidation', value, detail, icon: '⚡' };
}
