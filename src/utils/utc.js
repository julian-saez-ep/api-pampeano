/**
 * Convierte fecha/hora a formato UTC para Odoo
 * @param {string} dateTimeString - Fecha/hora en formato string
 * @returns {string} - Fecha/hora en formato UTC para Odoo
 */

import { DateTime } from 'luxon';

export const toUTCForOdoo = (dateTimeString) => {
  const localZone = 'America/Argentina/Buenos_Aires';
  const localTime = DateTime.fromFormat(dateTimeString, 'yyyy-MM-dd HH:mm:ss', { zone: localZone });

  if (!localTime.isValid) {
    throw new Error(`Formato de fecha inválido: ${dateTimeString}`);
  }

  return localTime.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
};

export default toUTCForOdoo;
