# 📋 GUÍA PARA FUTUROS AGENTES - PROYECTO FLASHCARD

## 🎯 ESTRUCTURA DEL PROYECTO

### ✅ ARCHIVO PRINCIPAL (ÚNICO A MODIFICAR)
```
app-functional.js
```
**⚠️ IMPORTANTE:** Este es el ÚNICO archivo JavaScript que debe modificarse. NO crear nuevos archivos JS.

### 📁 ARCHIVOS PRINCIPALES DEL PROYECTO
```
FLASHCARD/
├── app.html                    # Archivo HTML principal
├── app-functional.js      # ⭐ ÚNICO archivo JavaScript
├── styles.css                  # Estilos CSS
├── backup_js/                  # Backup de archivos eliminados
└── README_PARA_AGENTES.md      # Esta documentación
```

---

## 🚀 DEPLOYMENT AUTOMÁTICO

### Frontend (GitHub Pages)
- **Repositorio**: https://github.com/Matraca130/FLASHCARD
- **URL Pública**: https://matraca130.github.io/FLASHCARD/app.html
- **Deployment**: Automático al hacer `git push origin main`
- **Tiempo**: 1-5 minutos para actualizar

### Backend (Render)
- **URL API**: https://flashcard-u10n.onrender.com
- **Deployment**: Automático desde GitHub
- **Configuración**: Ya establecida y funcionando

---

## 📝 REGLAS PARA MODIFICACIONES

### ✅ LO QUE SÍ HACER:
1. **Modificar solo `app-functional.js`**
2. **Hacer commit después de cada cambio**
3. **Probar localmente antes de push**
4. **Usar nombres descriptivos en commits**

### ❌ LO QUE NO HACER:
1. **NO crear nuevos archivos .js**
2. **NO duplicar código en múltiples archivos**
3. **NO modificar archivos en backup_js/**
4. **NO cambiar la estructura HTML sin verificar**

---

## 🔧 PROCESO DE MODIFICACIÓN

### 1. Hacer Cambios
```bash
# Editar el archivo principal
nano app-functional.js

# O usar herramientas de edición
```

### 2. Probar Localmente
```bash
# Abrir en navegador local para probar
# Verificar consola de errores
```

### 3. Commit y Deploy
```bash
git add app-functional.js
git commit -m "DESCRIPCIÓN_DEL_CAMBIO"
git push origin main
```

### 4. Verificar Deployment
- **Frontend**: Esperar 1-5 minutos, verificar en GitHub Pages
- **Backend**: Si hay cambios de API, verificar en Render

---

## 🧩 ARQUITECTURA ACTUAL

### Frontend
- **Tecnología**: HTML + CSS + JavaScript vanilla
- **Hosting**: GitHub Pages (estático)
- **Archivo principal**: `app-functional.js`
- **Conectividad**: API calls al backend de Render

### Backend
- **Tecnología**: Flask (Python)
- **Hosting**: Render
- **Base de datos**: Configurada en Render
- **CORS**: Configurado para GitHub Pages

---

## 🔍 TROUBLESHOOTING

### Si la aplicación no funciona:
1. **Verificar consola del navegador** (F12)
2. **Comprobar que solo existe `app-functional.js`**
3. **Verificar conectividad con backend**
4. **Revisar si hay errores de CORS**

### Si hay problemas de caché:
1. **Agregar parámetro de versión**: `?v=TIMESTAMP`
2. **Usar Ctrl+F5 para forzar recarga**
3. **Esperar 5-10 minutos para GitHub Pages**

---

## 📞 CONECTIVIDAD FRONTEND-BACKEND

### Configuración en `app-functional.js`:
```javascript
const CONFIG = {
    API_BASE_URL: 'https://flashcard-u10n.onrender.com/api',
    STORAGE_PREFIX: 'studyingflash_',
    DEBUG: true
};
```

### URLs Importantes:
- **Frontend**: https://matraca130.github.io/FLASHCARD/app.html
- **Backend API**: https://flashcard-u10n.onrender.com/api
- **Health Check**: https://flashcard-u10n.onrender.com/health

---

## ⚡ COMANDOS RÁPIDOS

```bash
# Ver archivos JS (debe mostrar solo 1)
ls *.js

# Verificar estado del repositorio
git status

# Push rápido después de modificaciones
git add . && git commit -m "UPDATE: descripción" && git push origin main

# Verificar backup disponible
ls backup_js/ | wc -l
```

---

## 🎯 OBJETIVO FINAL

**Mantener la aplicación funcionando con:**
- ✅ 1 solo archivo JavaScript
- ✅ Navegación entre secciones funcional
- ✅ Conectividad frontend-backend estable
- ✅ Deployment automático funcionando

**¡NUNCA crear archivos JavaScript adicionales!**

