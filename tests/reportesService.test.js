import { expect } from 'chai';
import * as reportesService from '../services/reportesService.js';
import { Asistencia, Empleado, Direccion } from '../models/index.js';

describe('Reportes Service Tests', () => {
  let dir1, dir2;
  let emp1, emp2;
  let asist1, asist2;

  before(async () => {
    await Asistencia.sequelize.sync({ alter: true });

    // Crear 2 direcciones distintas con nombres únicos
    const name1 = 'Dirección Test Uno ' + Math.random().toString(36).substring(2, 9);
    const name2 = 'Dirección Test Dos ' + Math.random().toString(36).substring(2, 9);
    dir1 = await Direccion.create({ nombre_direccion: name1 });
    dir2 = await Direccion.create({ nombre_direccion: name2 });

    // Crear 1 empleado en cada dirección
    emp1 = await Empleado.create({
      cedula: Math.floor(100000 + Math.random() * 900000),
      primer_nombre: 'Empleado1',
      primer_apellido: 'Test',
      id_direccion: dir1.id_direccion,
      id_cargo: 1,
      id_horario: 1,
      activo: true
    });

    emp2 = await Empleado.create({
      cedula: Math.floor(100000 + Math.random() * 900000),
      primer_nombre: 'Empleado2',
      primer_apellido: 'Test',
      id_direccion: dir2.id_direccion,
      id_cargo: 1,
      id_horario: 1,
      activo: true
    });

    // Registrar asistencia para hoy
    const hoyStr = new Date().toISOString().split('T')[0];
    
    asist1 = await Asistencia.create({
      cedula: emp1.cedula,
      fecha: hoyStr,
      hora_entrada: '08:00:00',
      hora_salida: '12:00:00'
    });

    asist2 = await Asistencia.create({
      cedula: emp2.cedula,
      fecha: hoyStr,
      hora_entrada: '08:15:00',
      hora_salida: '12:15:00'
    });
  });

  after(async () => {
    // Limpieza
    await Asistencia.destroy({ where: { cedula: [emp1.cedula, emp2.cedula] } });
    await Empleado.destroy({ where: { cedula: [emp1.cedula, emp2.cedula] } });
    await Direccion.destroy({ where: { id_direccion: [dir1.id_direccion, dir2.id_direccion] } });
  });

  it('Debe retornar únicamente asistencias de la dirección filtrada', async () => {
    // Consultar reporte para la dirección 1
    const result = await reportesService.getReporteAsistencia({
      rango: 'diario',
      fecha: new Date().toISOString().split('T')[0],
      id_direccion: dir1.id_direccion,
      isDeveloper: false
    });

    expect(result.asistencias).to.have.lengthOf(1);
    expect(result.asistencias[0].Cedula).to.equal(emp1.cedula);
    expect(result.nombreDireccion).to.equal(dir1.nombre_direccion);
  });

  it('Debe retornar todas las asistencias si el rol es Desarrollador (Developer) sin filtro de dirección', async () => {
    const result = await reportesService.getReporteAsistencia({
      rango: 'diario',
      fecha: new Date().toISOString().split('T')[0],
      id_direccion: null,
      isDeveloper: true
    });

    const cedulas = result.asistencias.map(a => a.Cedula);
    expect(cedulas).to.include(emp1.cedula);
    expect(cedulas).to.include(emp2.cedula);
  });
});
