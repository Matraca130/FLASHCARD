# 🚀 Guía de Despliegue en Render

## ✅ Archivos de Configuración Creados

Tu backend está listo para desplegarse en Render con los siguientes archivos:

- `render.yaml` - Configuración de servicios de Render
- `gunicorn.conf.py` - Servidor de producción
- `app/config.py` - Configuración para desarrollo/producción
- `requirements.txt` - Dependencias actualizadas

## 📋 Pasos para Desplegar

### 1. **Crear Cuenta en Render**
- Ve a [render.com](https://render.com)
- Regístrate con tu cuenta de GitHub

### 2. **Conectar Repositorio**
- En Render Dashboard, click "New +"
- Selecciona "Web Service"
- Conecta tu repositorio GitHub: `Matraca130/FLASHCARD`

### 3. **Configuración del Servicio**
```
Name: studyingflash-backend
Environment: Python 3
Build Command: pip install -r requirements.txt
Start Command: python run.py
```

### 4. **Variables de Entorno (Automáticas)**
Render detectará automáticamente desde `render.yaml`:
- `FLASK_ENV=production`
- `FLASK_DEBUG=false`
- `DATABASE_URL` (PostgreSQL automática)
- `JWT_SECRET_KEY` (generada automáticamente)
- `SECRET_KEY` (generada automáticamente)

### 5. **URL Final**
Tu backend estará disponible en:
```
https://studyingflash-backend.onrender.com
```

## 🔗 Integración Completa

### Frontend (GitHub Pages)
- ✅ Ya configurado: https://matraca130.github.io/FLASHCARD/
- ✅ ApiClient actualizado para usar Render URL

### Backend (Render)
- ✅ Configuración lista
- ✅ Base de datos PostgreSQL incluida
- ✅ HTTPS automático
- ✅ Auto-deploy en cada git push

## 🎯 Resultado Final

Una vez desplegado tendrás:

1. **Frontend**: https://matraca130.github.io/FLASHCARD/
2. **Backend**: https://studyingflash-backend.onrender.com
3. **Auto-deploy**: Cada `git push` actualiza automáticamente
4. **Base de datos**: PostgreSQL en la nube
5. **HTTPS**: SSL automático

## ⚡ Comandos Útiles

```bash
# Verificar estado del backend
curl https://studyingflash-backend.onrender.com/api/health

# Ver logs en tiempo real (desde Render dashboard)
# Logs > View Logs
```

## 🔧 Troubleshooting

Si hay problemas:
1. Revisa los logs en Render Dashboard
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que el repositorio esté actualizado

¡Tu aplicación StudyingFlash estará completamente en la nube!

