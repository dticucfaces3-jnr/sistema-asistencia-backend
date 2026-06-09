import { expect } from 'chai';
import { registrarAuditoria } from '../services/auditoriaService.js';
import { Auditoria, UsuarioSistema, Empleado, Direccion } from '../models/index.js';

describe('Auditoria Service Tests', () => {
  let testDirection;
  let testEmployee;
  let testUser;

  before(async () => {
    await Auditoria.sequelize.sync({ alter: true });

    // Crear dirección única
    const uniqueDirName = 'Dirección Auditoría ' + Math.random().toString(36).substring(2, 9);
    testDirection = await Direccion.create({ nombre_direccion: uniqueDirName });

    // Crear empleado
    const uniqueCedula = Math.floor(100000 + Math.random() * 900000);
    testEmployee = await Empleado.create({
      cedula: uniqueCedula,
      primer_nombre: 'Audit',
      primer_apellido: 'User',
      id_direccion: testDirection.id_direccion,
      id_cargo: 1,
      id_horario: 1,
      activo: true
    });

    // Crear usuario único
    const uniqueUsername = `admin_audit_${Math.random().toString(36).substring(2, 9)}@uc.edu.ve`;
    testUser = await UsuarioSistema.create({
      username: uniqueUsername,
      password_hash: 'hash_123',
      rol: 'Administrador',
      cedula_empleado: testEmployee.cedula,
      email_confirmado: true
    });
  });

  after(async () => {
    if (testUser) {
      await Auditoria.destroy({ where: { usuario_id: testUser.id_usuario } });
      await UsuarioSistema.destroy({ where: { id_usuario: testUser.id_usuario } });
    }
    if (testEmployee) {
      await Empleado.destroy({ where: { cedula: testEmployee.cedula } });
    }
    if (testDirection) {
      await Direccion.destroy({ where: { id_direccion: testDirection.id_direccion } });
    }
  });

  it('Debe insertar un registro en la tabla Auditorias con los valores provistos', async () => {
    const req = {
      user: {
        id_usuario: testUser.id_usuario,
        rol: 'Administrador',
        isDeveloper: false
      }
    };

    const valoresAnteriores = { activo: false };
    const valoresNuevos = { activo: true };

    // Registrar auditoría
    await registrarAuditoria('Empleados', testEmployee.cedula, 'UPDATE', valoresAnteriores, valoresNuevos, req);

    // Buscar en BD
    const audit = await Auditoria.findOne({
      where: {
        tabla_afectada: 'Empleados',
        registro_id: testEmployee.cedula,
        usuario_id: testUser.id_usuario
      }
    });

    expect(audit).to.not.be.null;
    expect(audit.accion).to.equal('UPDATE');
    expect(JSON.parse(audit.valores_anteriores)).to.deep.equal(valoresAnteriores);
    expect(JSON.parse(audit.valores_nuevos)).to.deep.equal(valoresNuevos);
  });
});
