# Reglas de Implementación de Mapbox (TrackDeli)

Estas reglas deben seguirse estrictamente al trabajar con Mapbox en cualquier parte del ecosistema de TrackDeli:

## Autenticación
- **Web (React/Vite)**: Mapbox GL JS requiere que el token esté asignado en `mapboxgl.accessToken` **ANTES** de instanciar o crear el mapa.
- **Móvil (Flutter)**: El token de Mapbox debe colocarse en el `AndroidManifest.xml` (o `Info.plist`), **NO** directamente en el código Dart.

## Estilo y Diseño (Design System)
- El estilo del mapa oficial es `mapbox://styles/mapbox/light-v11`. Es mandatorio usar este estilo para mantener la consistencia con el *light mode* del Design System de la plataforma.
- **Marcador de Destino (Cliente)**: Debe usar el color rojo (`#EF4444`) para que sea fácil de distinguir visualmente en el mapa claro.
- **Marcador del Repartidor**: Debe usar un pin circular de color verde (`#22C55E`) con un emoji de moto (🛵) centrado en su interior.

## Comportamiento de Vista (Posición Inicial)
- **Web Pública de Tracking (`apps/tracking`)**: La posición inicial del mapa siempre debe estar centrada en las coordenadas de destino (dirección del cliente).
- **Dashboard del Encargado (`apps/admin`)**: La posición inicial del mapa debe estar centrada en Managua (`12.1364`, `-86.2504`).
- **Visibilidad del Repartidor**: En la web de tracking pública, el marcador del repartidor SOLO se debe renderizar si existe una posición previa (`lastPosition` almacenada en Redis) o si el pedido está en estado `EN_CAMINO`.
