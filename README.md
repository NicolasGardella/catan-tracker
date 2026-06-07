# 🎲 Catan Tracker para Colonist.io

Extensión de Chrome/Brave que lleva la cuenta automática de las cartas de cada jugador en [colonist.io](https://colonist.io), leyendo el log de la partida en tiempo real.

Desarrollada por **Nikito**.

## ✨ Funciones

- **Conteo de recursos** por jugador (madera, ladrillo, lana, trigo, piedra)
- **Auto-reconciliación** con el total real de cartas que muestra el juego
- **Robos del ladrón**: visibles y ocultos (columnas ❓ y 🥷)
- **Comercios** entre jugadores y con el banco/puerto
- **Construcciones**: caminos, casas y ciudades (con costos)
- **Cartas de desarrollo**: compradas, en mano y usadas (Caballero, Monopolio, etc.)
- **Tooltips** en cada jugador con su detalle de construcciones y desarrollo
- **Colores** y orden iguales al panel del juego
- Botón 🔄 para releer todo el historial
- Mensaje automático en el chat al iniciar la partida

## 📥 Instalación

1. Descargá este repositorio (botón verde **Code → Download ZIP**) y descomprimilo.
2. Abrí tu navegador en `chrome://extensions` (o `brave://extensions`).
3. Activá el **Modo desarrollador** (interruptor arriba a la derecha).
4. Hacé clic en **Cargar descomprimida** y seleccioná la carpeta `catan-tracker`.
5. Entrá a [colonist.io](https://colonist.io) y jugá: el panel aparece arriba a la izquierda.

## 🧩 Columnas del panel

| Columna | Significado |
|---|---|
| 🌲 🧱 🐑 🌾 ⛏️ | Recursos conocidos |
| ❓ | Cartas que robó (tipo desconocido) |
| 🥷 | Cartas que le robaron (tipo desconocido) |
| Σ | Total de cartas (coincide con el juego) |

## 🛠️ Comandos de consola (F12)

- `catanReconcile()` — fuerza la reconciliación con el juego
- `catanPlayers()` — muestra la tabla de jugadores
- `catanGreet()` — reenvía el mensaje de chat
- `catanReset()` — reinicia el conteo

## ⚠️ Aviso

Esta herramienta solo **lee información pública** del log que ya es visible para todos los jugadores. No accede a las manos ocultas de los rivales.
