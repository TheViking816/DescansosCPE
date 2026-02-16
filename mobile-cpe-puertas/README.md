# CPE Puertas Mobile

Proyecto auxiliar dentro de este repo para calcular distancia a puertas en el portal CPE.

## Que es y que no es
- Es una app movil nativa (Expo + React Native + WebView).
- No es una extension de navegador (Chrome/Edge/Firefox).
- No modifica ni interfiere con la aplicacion web principal `descansos`; es un modulo separado.

## URL objetivo
La app abre el portal CPE y esta orientada al flujo de Chapero, incluyendo esta ruta:
- `https://portal.cpevalencia.com/Noray/InformeEspecialidadesChapSinE.asp`

Tambien usa navegacion interna del portal (`#Home` y `#User,ViewNoray,8`) para llegar rapido al apartado de calculo.

## Para que sirve
1. Iniciar sesion en el portal dentro de la WebView.
2. Ir a Chapero.
3. Introducir una chapa.
4. Calcular distancia circular a puertas (LAB/FES/NOC/NOC-FES) segun el censo visible.

## Requisitos
- Node 18+
- Android Studio (Android) o Xcode (iOS)
- Expo Go (opcional, recomendado para pruebas rapidas)

## Instalacion
```bash
cd "C:\Users\adria\Proyectos _IA\descansos\mobile-cpe-puertas"
npm install
```

## Ejecutar
```bash
npm start
```

Desde Expo:
- `a` para Android
- `i` para iOS (macOS)

## Compartir con otros usuarios
Como no es extension, no se distribuye por Chrome Web Store.
Opciones reales para compartirlo:
- Compartir el codigo para que lo ejecuten con Expo Go.
- Generar APK/IPA y distribuir instalables.
- Publicarla en Google Play / App Store.

Si en el futuro se quisiera una extension de navegador, habria que crear un proyecto distinto (Manifest V3) para inyectar script en el dominio del portal.
