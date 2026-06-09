import { expect } from 'chai';
import * as authService from '../services/authService.js';
import { UsuarioSistema, Desarrollador, Empleado, Direccion } from '../models/index.js';

describe('Auth Service Tests', () => {
  let testDirection;
  let testEmployee;
  let adminUsername = `admin_${Math.random().toString(36).substring(2, 9)}@uc.edu.ve`;

  before(async () => {
    // Asegurar que las tablas existen y están actualizadas
    await Direccion.sequelize.sync({ alter: true });

    // Crear dirección de prueba con nombre único
    const uniqueDirName = 'Dirección de Pruebas ' + Math.random().toString(36).substring(2, 9);
    testDirection = await Direccion.create({
      nombre_direccion: uniqueDirName
    });

    // Crear empleado de prueba
    testEmployee = await Empleado.create({
      cedula: Math.floor(100000 + Math.random() * 900000), // Cédula única aleatoria
      primer_nombre: 'Test',
      primer_apellido: 'User',
      id_direccion: testDirection.id_direccion,
      id_cargo: 1, 
      id_horario: 1, 
      activo: true
    });
  });

  after(async () => {
    // Limpieza
    if (testEmployee) {
      await UsuarioSistema.destroy({ where: { cedula_empleado: testEmployee.cedula } });
      await Empleado.destroy({ where: { cedula: testEmployee.cedula } });
    }
    if (testDirection) {
      await Direccion.destroy({ where: { id_direccion: testDirection.id_direccion } });
    }
  });

  it('Debe registrar un nuevo administrador y lanzarle código de confirmación', async () => {
    const admin = await authService.register(adminUsername, 'secure_password_123', 'Administrador', testEmployee.cedula);
    
    expect(admin).to.have.property('id_usuario');
    expect(admin.username).to.equal(adminUsername);
    expect(admin.email_confirmado).to.be.false;
    expect(admin.codigo_confirmacion).to.not.be.null;
    expect(admin.codigo_confirmacion).to.have.lengthOf(6);
  });

  it('No debe permitir registrar un segundo administrador para la misma dirección', async () => {
    // Intentar registrar otro empleado en la misma dirección
    const anotherCedula = Math.floor(100000 + Math.random() * 900000);
    const anotherEmployee = await Empleado.create({
      cedula: anotherCedula,
      primer_nombre: 'Another',
      primer_apellido: 'User',
      id_direccion: testDirection.id_direccion,
      id_cargo: 1,
      id_horario: 1,
      activo: true
    });

    const anotherUsername = `another_${Math.random().toString(36).substring(2, 9)}@uc.edu.ve`;

    try {
      // Intentar registrar segundo administrador en la misma dirección
      await authService.register(anotherUsername, 'password_123', 'Administrador', anotherCedula);
      throw new Error('Debió fallar la creación de un segundo Administrador');
    } catch (error) {
      expect(error.message).to.contain('ya cuenta con un Administrador registrado');
    } finally {
      await Empleado.destroy({ where: { cedula: anotherCedula } });
    }
  });

  it('Debe confirmar el correo electrónico con el código correcto', async () => {
    const admin = await UsuarioSistema.findOne({ where: { username: adminUsername } });
    
    const res = await authService.confirmEmail(admin.username, admin.codigo_confirmacion);
    expect(res.message).to.contain('confirmado correctamente');
    
    const updatedAdmin = await UsuarioSistema.findByPk(admin.id_usuario);
    expect(updatedAdmin.email_confirmado).to.be.true;
    expect(updatedAdmin.codigo_confirmacion).to.be.null;
  });
});
