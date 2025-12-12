#!/bin/bash

# Este script automatiza la configuración del repositorio remoto y la subida de cambios a GitHub.

echo "PASO 1: Configurando la conexión con tu repositorio de GitHub..."
# Primero, intenta eliminar 'origin' por si existe y está mal configurado.
# El '|| true' evita que el script se detenga si 'origin' no existe.
git remote remove origin || true
# Ahora, añade 'origin' con la URL correcta. Este es el comando clave que faltaba.
git remote add origin https://github.com/ozytarget/INVOZY.git
echo "Conexión establecida con https://github.com/ozytarget/INVOZY.git"
echo "----------------------------------------------------"
echo ""

echo "PASO 2: Preparando todos los cambios para subirlos..."
git add .
echo "Archivos preparados."
echo "----------------------------------------------------"
echo ""

echo "PASO 3: Empaquetando los cambios con un mensaje..."
# Se creará un commit solo si hay cambios nuevos que guardar.
if git diff-index --quiet HEAD --; then
    echo "No hay cambios nuevos que empaquetar. Pasando al siguiente paso."
else
    git commit -m "Deploy: Sincronización automática de archivos del proyecto"
    echo "Cambios empaquetados."
fi
echo "----------------------------------------------------"
echo ""

echo "PASO 4: Subiendo tu código a GitHub..."
# Forzamos la subida a la rama 'main'
git push origin main

echo ""
echo "----------------------------------------------------"
echo "¡LISTO! Tu proyecto ha sido subido a GitHub."
echo "Puedes verificarlo en: https://github.com/ozytarget/INVOZY"
