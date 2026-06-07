# 🎲 Catan Tracker para Colonist.io

Extensión de Chrome/Brave que lleva la cuenta automática de las cartas de cada jugador en [colonist.io](https://colonist.io), leyendo el log de la partida en tiempo real.

Hecha por **Nikito** 😎

> 🇬🇧 English version: see the [**README.md**](README.md).

## ✨ Qué hace

- **Cuenta los recursos** de cada jugador (madera, ladrillo, lana, trigo, piedra)
- **Se auto-corrige** comparando con el total real de cartas que muestra el juego
- **Robos del ladrón**: visibles y ocultos (columnas ❓ y 🥷)
- **Comercios** entre jugadores y con el banco/puerto
- **Construcciones**: caminos, casas y ciudades (con sus costos)
- **Cartas de desarrollo**: compradas, en mano y usadas (Caballero, Monopolio, etc.)
- **Tooltips** en cada jugador con el detalle de construcciones y desarrollo
- **Colores** y orden iguales al panel del juego
- Botón 🔄 para releer todo el historial
- Mensaje automático en el chat al empezar la partida

## 📥 Cómo instalarla en Google Chrome

1. **Descargá** el código: en esta página de GitHub, hacé clic en el botón verde **`Code`** → **`Download ZIP`**.
2. **Descomprimí** el ZIP en una carpeta de tu PC (te queda una carpeta `catan-tracker`).
3. Abrí Chrome y escribí en la barra de direcciones **`chrome://extensions`**.
4. Arriba a la derecha, activá el **Modo de desarrollador**.
5. Hacé clic en **`Cargar extensión sin empaquetar`**.
6. Elegí la carpeta **`catan-tracker`** que descomprimiste.
7. ¡Listo! Entrá a [colonist.io](https://colonist.io) y jugá: el panel aparece arriba a la izquierda.

> **Brave/Edge:** es igual, pero la dirección es `brave://extensions` o `edge://extensions`.

> **Ojo:** dejá la carpeta descomprimida en tu PC. Si la borrás o la movés, la extensión deja de andar. Para actualizarla, reemplazá los archivos y tocá el botón de recargar 🔄 en `chrome://extensions`.

## 🧩 Columnas del panel

| Columna | Significado |
|---|---|
| 🌲 🧱 🐑 🌾 ⛏️ | Recursos conocidos |
| ❓ | Cartas que robó (tipo desconocido) |
| 🥷 | Cartas que le robaron (tipo desconocido) |
| Σ | Total de cartas (coincide con el juego) |

## 🛠️ Comandos de consola

Abrí la consola del navegador con **`F12`** (pestaña **Console**) y escribí cualquiera de estos mientras estás en una partida:

| Comando | Qué hace |
|---|---|
| `catanReload()` | Relee **todo el historial** de la partida y recalcula desde cero (igual que el botón 🔄 del panel). |
| `catanReconcile()` | Fuerza la **reconciliación** de los totales con las cartas que muestra el juego. |
| `catanReset()` | **Reinicia** el conteo a cero (borra todos los datos). |
| `catanPlayers()` | Muestra en una **tabla** el detalle de cartas de cada jugador. |
| `catanColors()` | Muestra los **colores** detectados de cada jugador. |
| `catanGreet()` | Reenvía el **mensaje automático** al chat de la partida. |
| `catanOrder()` | Diagnóstico: muestra el **orden** de jugadores leído del juego. |
| `catanPanel()` | Diagnóstico: vuelca el **panel de jugadores** del juego (para depurar). |

> Los comandos de diagnóstico (`catanOrder`, `catanPanel`) sirven sobre todo para reportar problemas.

## ⚠️ Aviso

Esta herramienta solo **lee información pública** del log que ya es visible para todos los jugadores. No accede a las manos ocultas de los rivales.
