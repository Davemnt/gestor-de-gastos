// ==================== CONFIGURACIÓN FIREBASE PARA VERSIÓN DEMO ====================
// Este archivo contiene las credenciales de Firebase para el proyecto de demostración
// IMPORTANTE: Este proyecto es independiente de la versión de producción

// Objeto de configuración con todas las credenciales necesarias para conectarse a Firebase
const firebaseConfig = {
  // API Key: Clave pública que identifica tu aplicación web con Firebase
  // Esta clave es segura de exponer públicamente ya que está protegida por reglas de seguridad
  apiKey: "AIzaSyAdR-pzl1Nd1uM9JPjZMQT5Pht9k9PGcWQ",
  
  // Auth Domain: Dominio usado para autenticación de usuarios
  // Firebase crea automáticamente este subdominio para tu proyecto
  authDomain: "gestor-de-gastos-demo.firebaseapp.com",
  
  // Project ID: Identificador único de tu proyecto en Firebase
  // Este ID se usa para todas las operaciones de base de datos y servicios
  projectId: "gestor-de-gastos-demo",
  
  // Storage Bucket: URL del bucket de Cloud Storage para archivos
  // Aquí se almacenarían comprobantes, imágenes, PDFs, etc.
  storageBucket: "gestor-de-gastos-demo.firebasestorage.app",
  
  // Messaging Sender ID: ID para notificaciones push (Firebase Cloud Messaging)
  // Se usa si quieres enviar notificaciones a los usuarios
  messagingSenderId: "344642135496",
  
  // App ID: Identificador único de esta aplicación específica dentro del proyecto
  // Un proyecto puede tener múltiples apps (web, iOS, Android)
  appId: "1:344642135496:web:38f046c423c08df8014cfd"
};

// Mensajes de consola para debugging
// Ayudan a identificar qué versión del config se está cargando
console.log('🎭 Configuración DEMO cargada');
console.log('📋 Proyecto:', firebaseConfig.projectId);

// NOTAS DE SEGURIDAD:
// - Este proyecto tiene reglas de Firestore más permisivas para permitir demos públicas
// - Los datos son ficticios y se pueden borrar periódicamente
// - No almacenar información sensible o real en este proyecto
// - Para producción, usar firebase-config.js con el proyecto gestor-de-gastos-e46ff
