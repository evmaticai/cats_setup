// Style registry for LookStage. Each style is one file in ./styles/ (values from reference/video-research).
export * from './types';
import type { LookPreset, StyleId } from './types';
import { LOOK as toonInk } from './styles/toon-ink';
import { LOOK as brightBlocky } from './styles/bright-blocky';
import { LOOK as polishedGame } from './styles/polished-game';
import { LOOK as ps1 } from './styles/ps1';
import { LOOK as clay } from './styles/clay';
import { LOOK as reef } from './styles/reef';
import { LOOK as cozy } from './styles/cozy';
import { LOOK as reefSmooth } from './styles/reef-smooth';
import { LOOK as cozySmooth } from './styles/cozy-smooth';

export const LOOKS: Record<StyleId, LookPreset> = {
  'toon-ink': toonInk, 'bright-blocky': brightBlocky, 'polished-game': polishedGame, ps1, clay, reef, cozy, 'reef-smooth': reefSmooth, 'cozy-smooth': cozySmooth, 'reef-hi': { ...reef, id: 'reef-hi', label: 'Reef PS1, cover resolution', ps1H: 960 },
};
