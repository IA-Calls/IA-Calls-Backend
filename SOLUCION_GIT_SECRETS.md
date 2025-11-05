# 🔐 Solución: Error de GitHub Push Protection

## 🐛 Problema

GitHub está bloqueando el push porque detecta credenciales de Twilio en **commits antiguos** del historial de Git, aunque ya las removimos del código actual.

## ✅ Soluciones Disponibles

### Opción 1: Permitir Temporalmente el Push (RÁPIDA) ⚡

GitHub proporciona un URL para permitir temporalmente el push:

```
https://github.com/IA-Calls/IA-Calls-Backend/security/secret-scanning/unblock-secret/352v07iMEyb13oj4as3Y3CRDdB5
```

**Pasos:**
1. Abre el URL en tu navegador
2. Haz clic en "Allow secret" para permitir el push temporalmente
3. Haz push nuevamente: `git push origin main`
4. **IMPORTANTE**: Después del push, sigue con la Opción 2 para limpiar el historial

### Opción 2: Limpiar el Historial de Git (RECOMENDADA) 🔒

Esta opción remueve las credenciales del historial completo de Git.

#### Requisitos:
```bash
# Instalar git-filter-repo (recomendado)
pip install git-filter-repo

# O usar BFG Repo-Cleaner
# Descargar de: https://rtyley.github.io/bfg-repo-cleaner/
```

#### Pasos para Limpiar el Historial:

**1. Hacer backup del repositorio:**
```bash
cd ..
cp -r IA-Calls-Backend IA-Calls-Backend-backup
cd IA-Calls-Backend
```

**2. Crear archivo con las credenciales a remover:**
```bash
# Crear archivo secrets.txt
echo "AC332953b4c00211a282b4c59d45faf749" > secrets.txt
echo "cfd6638b2384981c48edfe84835219da" >> secrets.txt
```

**3. Usar git-filter-repo para remover secretos:**
```bash
# Remover Account SID de todo el historial
git filter-repo --replace-text secrets.txt --force

# O usar expresiones regulares
git filter-repo --invert-paths --path-glob 'AGREGAR_A_ENV*.txt' --force
git filter-repo --invert-paths --path-glob 'RESUMEN_FINAL*.md' --force
```

**4. Forzar push (⚠️ CUIDADO: Esto reescribe el historial):**
```bash
git push origin main --force
```

#### Usando BFG Repo-Cleaner (Alternativa):

```bash
# Descargar BFG
# https://rtyley.github.io/bfg-repo-cleaner/

# Crear archivo con secretos a remover
echo "AC332953b4c00211a282b4c59d45faf749" > secrets.txt

# Limpiar historial
java -jar bfg.jar --replace-text secrets.txt

# Limpiar referencias
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Forzar push
git push origin main --force
```

### Opción 3: Rotar las Credenciales (RECOMENDADA por Seguridad) 🔑

Si las credenciales ya están expuestas en el historial, **debes rotarlas**:

1. **Ir a Twilio Console**: https://www.twilio.com/console
2. **Generar nuevas credenciales**:
   - Account SID (nuevo)
   - Auth Token (nuevo)
3. **Actualizar el archivo `.env`** con las nuevas credenciales
4. **Revocar las credenciales antiguas** en Twilio

## 🎯 Plan Recomendado

1. **Inmediato**: Usar el URL de GitHub para permitir el push temporalmente
2. **Corto plazo**: Rotar las credenciales de Twilio (IMPORTANTE por seguridad)
3. **Mediano plazo**: Limpiar el historial de Git usando git-filter-repo

## 📋 Checklist de Seguridad

- [ ] Usar URL de GitHub para permitir push temporal
- [ ] Rotar credenciales de Twilio (generar nuevas)
- [ ] Actualizar `.env` con nuevas credenciales
- [ ] Limpiar historial de Git (usar git-filter-repo)
- [ ] Verificar que no hay más secretos: `git log --all --full-history --source --grep="AC332953"`
- [ ] Agregar `.env` al `.gitignore` (ya está)
- [ ] Configurar git-secrets localmente para prevenir futuros commits con secretos

## 🔍 Verificar que no hay más secretos

```bash
# Buscar Account SID en todo el historial
git log --all --full-history -p | grep -i "AC332953"

# Buscar Auth Token
git log --all --full-history -p | grep -i "cfd6638b2384981c48edfe84835219da"
```

## ⚠️ Advertencias Importantes

1. **Rotar credenciales**: Si las credenciales están en el historial público, están expuestas. Debes rotarlas.

2. **Force push**: Limpiar el historial requiere `git push --force`, lo cual puede afectar a otros colaboradores. Avisa al equipo antes de hacerlo.

3. **Backup**: Siempre haz backup antes de modificar el historial de Git.

4. **Git-secrets**: Configura git-secrets localmente para prevenir futuros commits con secretos:

```bash
# Instalar git-secrets
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets
sudo make install

# Configurar en el repositorio
cd ../IA-Calls-Backend
git secrets --install
git secrets --register-aws
git secrets --add 'AC[a-z0-9]{32}'  # Pattern para Account SID de Twilio
```

## 📚 Referencias

- [GitHub: Working with push protection](https://docs.github.com/code-security/secret-scanning/working-with-secret-scanning-and-push-protection/working-with-push-protection-from-the-command-line)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [Twilio: Rotating Credentials](https://www.twilio.com/docs/iam/keys/rotate-keys)

