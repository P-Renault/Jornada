import { planNetGoal, closeJourney, metrics } from '../src/b20-core.js';
const p=planNetGoal({goalNet:60000,hoursPlan:8,netPerHour:8000,tripsPerHour:2,kmPerHour:20,efficiencyKmL:13,fuelPrice:1635,maintenancePerKm:.03,commissionPct:20});
if(p.gross<=60000) throw new Error('Gross plan inválido');
const c=closeJourney({startTime:'06:30',endTime:'14:30',kmStart:100,kmEnd:260,trips:12,gross:100000,fuelReal:20000,commissionReal:20000,settings:{efficiencyKmL:13,fuelPrice:1635,maintenancePerKm:.03,commissionPct:20}});
if(c.km!==160 || c.hours!==8 || c.net!==59995.2) throw new Error(`Cierre inesperado: ${JSON.stringify(c)}`);
const m=metrics([{estado:'cerrada',km_inicio:100,km_final:260,horas_trabajadas:8,viajes:12,ganancia_neta:c.net,combustible:c.fuel,meta_dia:60000}]);
if(m.n!==1 || m.avgNetHour!==7499.4) throw new Error(`Métrica inesperada: ${JSON.stringify(m)}`);
console.log('S01 smoke tests: OK');
