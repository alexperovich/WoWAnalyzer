import SPELLS from 'common/SPELLS';

import Module from 'Parser/Core/Module';
import calculateEffectiveHealing from 'Parser/Core/calculateEffectiveHealing';

import { ABILITIES_AFFECTED_BY_HEALING_INCREASES } from '../../Constants';

const debug = true;

export const TYRS_MUNIFICENCE_TRAIT_ID = 238060;
const TYRS_DELIVERANCE_BUFF_SPELL_ID = SPELLS.TYRS_DELIVERANCE_HEAL.id;
const TYRS_DELIVERANCE_BASE_HEALING_INCREASE = 0.2;
const TYRS_MUNIFICENCE_POINT_HEALING_INCREASE = 0.05;

class TyrsDeliverance extends Module {
  healHealing = 0;
  buffFoLHLHealing = 0;

  tyrsMunificenceTraits = null;
  on_initialized() {
    if (!this.owner.error) {
      this.tyrsMunificenceTraits = this.owner.selectedCombatant.traitsBySpellId[TYRS_MUNIFICENCE_TRAIT_ID] || 0;
    }
  }

  get tyrsHealingIncrease() {
    return TYRS_DELIVERANCE_BASE_HEALING_INCREASE + this.tyrsMunificenceTraits * TYRS_MUNIFICENCE_POINT_HEALING_INCREASE;
  }

  on_byPlayer_heal(event) {
    const spellId = event.ability.guid;
    if (ABILITIES_AFFECTED_BY_HEALING_INCREASES.indexOf(spellId) === -1) {
      return;
    }
    switch (spellId) {
      case SPELLS.TYRS_DELIVERANCE_HEAL.id:
        this.healHealing += event.amount + (event.absorbed || 0);
        break;
      case SPELLS.FLASH_OF_LIGHT.id:
      case SPELLS.HOLY_LIGHT.id: {
        const combatant = this.owner.combatants.players[event.targetID];
        if (!combatant) {
          // If combatant doesn't exist it's probably a pet.
          debug && console.log('Skipping event since combatant couldn\'t be found:', event);
          return;
        }
        if (!combatant.hasBuff(TYRS_DELIVERANCE_BUFF_SPELL_ID, event.timestamp)) {
          break;
        }

        this.buffFoLHLHealing += calculateEffectiveHealing(event, this.tyrsHealingIncrease);
        break;
      }
      default: break;
    }
  }
  on_beacon_heal({ beaconTransferEvent, matchedHeal: healEvent }) {
    const spellId = healEvent.ability.guid;
    if (spellId !== SPELLS.FLASH_OF_LIGHT.id && spellId !== SPELLS.HOLY_LIGHT.id) {
      return;
    }
    const combatant = this.owner.combatants.players[healEvent.targetID];
    if (!combatant) {
      // If combatant doesn't exist it's probably a pet.
      debug && console.log('Skipping beacon heal event since combatant couldn\'t be found:', beaconTransferEvent, 'for heal:', healEvent);
      return;
    }
    if (!combatant.hasBuff(TYRS_DELIVERANCE_BUFF_SPELL_ID, healEvent.timestamp)) {
      return;
    }

    this.buffFoLHLHealing += calculateEffectiveHealing(beaconTransferEvent, this.tyrsHealingIncrease);
  }
}

export default TyrsDeliverance;
