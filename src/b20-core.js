'use strict';

export function round(n, d = 2) {
  const p = 10 ** d;
  return Math.round((Number(n) || 0) * p) / p;
}

export function hoursBetween(start, end) {
  if (!start || !end) return 0;
  const [ah, am] = String(start).slice(0,5).split(':').map(Number);
  const [bh, bm] = String(end).slice(0,5).split(':').map(Number);
  let a = ah * 60 + am;
  let b = bh * 60 + bm;
  if (b < a) b += 1440;
  return round((b - a) / 60, 2);
}

export function planNetGoal({ goalNet, hoursPlan, netPerHour, tripsPerHour, kmPerHour, efficiencyKmL, fuelPrice, maintenancePerKm, commissionPct }) {
  const M = Math.max(0, Number(goalNet) || 0);
  const hp = Math.max(0, Number(hoursPlan) || 0);
  const nh = Math.max(0, Number(netPerHour) || 0);
  const tph = Math.max(0, Number(tripsPerHour) || 0);
  const kph = Math.max(0, Number(kmPerHour) || 0);
  const eff = Math.max(0.001, Number(efficiencyKmL) || 0.001);
  const fuelPriceN = Math.max(0, Number(fuelPrice) || 0);
  const maintKm = Math.max(0, Number(maintenancePerKm) || 0);
  const c = Math.min(0.99, Math.max(0, (Number(commissionPct) || 0) / 100));

  const hoursNeeded = nh > 0 ? M / nh : 0;
  const hours = Math.max(hp, hoursNeeded);
  const km = hours * kph;
  const trips = Math.ceil(hours * tph);
  const fuel = (km / eff) * fuelPriceN;
  const maintenance = km * maintKm;
  const grossRequired = (M + fuel + maintenance) / Math.max(0.01, 1 - c);
  const commission = grossRequired * c;
  const net = grossRequired - commission - fuel - maintenance;

  return {
    hoursNeeded: round(hoursNeeded), hours: round(hours), km: round(km,1), trips,
    fuel: round(fuel), maintenance: round(maintenance), gross: round(grossRequired),
    commission: round(commission), net: round(net)
  };
}

export function closeJourney({ startTime, endTime, kmStart, kmEnd, trips, gross, fuelReal, commissionReal, settings }) {
  const km = Math.max(0, (Number(kmEnd)||0) - (Number(kmStart)||0));
  const hours = hoursBetween(startTime, endTime);
  const fuel = fuelReal !== '' && fuelReal != null
    ? Math.max(0, Number(fuelReal)||0)
    : (km / Math.max(0.001, Number(settings.efficiencyKmL)||0.001)) * Math.max(0, Number(settings.fuelPrice)||0);
  const commission = commissionReal !== '' && commissionReal != null
    ? Math.max(0, Number(commissionReal)||0)
    : Math.max(0, Number(gross)||0) * Math.max(0, Number(settings.commissionPct)||0) / 100;
  const maintenance = km * Math.max(0, Number(settings.maintenancePerKm)||0);
  const grossN = Math.max(0, Number(gross)||0);
  const net = grossN - commission - fuel - maintenance;
  return { km: round(km,1), hours, trips: Math.max(0, Number(trips)||0), gross:grossN, fuel:round(fuel), commission:round(commission), maintenance:round(maintenance), net:round(net) };
}

export function metrics(rows) {
  const closed = rows.filter(r => String(r.estado).toLowerCase() === 'cerrada' || (r.hora_fin && r.km_final != null && r.ganancia_neta != null));
  const n = closed.length;
  if (!n) return { n:0, avgNetHour:0, avgNetKm:0, avgNetTrip:0, avgKmTrip:0, avgFuelKm:0, avgDeviation:0, avgDeviationPct:0, totalNet:0, totalKm:0, totalHours:0 };
  let totalNet=0,totalKm=0,totalHours=0,totalTrips=0,totalFuel=0,totalDeviation=0,totalDeviationPct=0, devCount=0;
  for (const r of closed) {
    const km = Math.max(0, Number(r.km_final||0)-Number(r.km_inicio||0));
    const h = Number(r.horas_trabajadas) > 0 ? Number(r.horas_trabajadas) : hoursBetween(r.hora_inicio,r.hora_fin);
    const trips = Number(r.viajes)||0;
    const net = Number(r.ganancia_neta)||0;
    const fuel = Number(r.combustible)||0;
    const meta = Number(r.meta_dia)||0;
    totalNet += net; totalKm += km; totalHours += h; totalTrips += trips; totalFuel += fuel;
    if (meta > 0) { totalDeviation += net-meta; totalDeviationPct += (net-meta)/meta*100; devCount++; }
  }
  return {
    n, totalNet:round(totalNet), totalKm:round(totalKm,1), totalHours:round(totalHours),
    avgNetHour:round(totalHours ? totalNet/totalHours : 0),
    avgNetKm:round(totalKm ? totalNet/totalKm : 0),
    avgNetTrip:round(totalTrips ? totalNet/totalTrips : 0),
    avgKmTrip:round(totalTrips ? totalKm/totalTrips : 0,2),
    avgFuelKm:round(totalKm ? totalFuel/totalKm : 0),
    avgDeviation:round(devCount ? totalDeviation/devCount : 0),
    avgDeviationPct:round(devCount ? totalDeviationPct/devCount : 0,2)
  };
}
