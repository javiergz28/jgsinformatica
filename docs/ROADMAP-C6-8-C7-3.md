# JG Next Gen · Hoja de ruta operativa C6.8 → C7.3

Actualizado: 19/11/2026, UYT. **Esta hoja de ruta es un plan de ejecución, no una declaración de trabajo terminado.**
Documento maestro: https://github.com/javiergz28/JG-Soluciones-Informaticas/issues/1

## Contrato de continuidad

- **Norte creativo:** SYSTEM EVOLUTION, una única computadora CORE-01, opción C blanco/pastel, superficies realistas y cian sobrio. Recorrido: BOOT → HARDWARE → CONNECT → INTELLIGENCE → CONTACT, sin cambios bruscos de identidad ni secciones sin enlace visual.
- **Fuente de verdad:** `03_Proyecto/CORE-01-BOOT.blend` (último SHA256 aprobado `1169b695582b76c08c5f4f43020f8b188fad3d14ad2d1c00887f494a85c04ce7`). Nunca sobrescribir si el hash no coincide con el Issue. Guardar recuperación externa antes de cambiar la fuente.
- **Ramas:** `javiergz28/jgsinformatica` es DEV. Cambios primero en rama feature/experiment; CI verde antes de actualizar **solo** `main` DEV, y verificación HTTP pública + navegador real después. `javiergz28/JG-Soluciones-Informaticas:main` es LIVE y queda totalmente fuera de alcance salvo aprobación expresa posterior.
- **No confundir:** pruebas Node ≠ QA de movimiento ≠ aprobación estética ≠ rendimiento de dispositivos reales. Distinguir los cuatro estados en las entregas y en el Issue.
- **Cero tareas duplicadas:** leer último manifiesto y hash, reusar render aprobado/derivados, no crear otro .blend maestro, no regenerar lotes de cientos de imágenes si una toma corta todavía falla.
- **Limpieza controlada:** conservar Blender, referencias CC0, scripts, hashes/manifiestos, versiones aprobadas, 18 imágenes seleccionadas y hojas cronológicas de branding; eliminar solo temporales identificados con manifest de limpieza. Cerrar Blender y Chrome QA al terminar: 0 procesos auxiliares.

## Protocolo de gates por checkpoint

**G0 · Preflight:** Issue, SHA de maestro, estado Git/local/remoto, dependencias, tamaño previo, cero GUI huérfana y plan de rollback.

**G1 · Prueba barata:** storyboard, animatic breve o A/B del algoritmo. Registrar reproducción ida/vuelta y captura mobile/desktop. Si falla continuidad o el resultado se degrada, **detenerse** y documentar; nunca lanzar lote completo por inercia.

**G2 · Evidencia medible:** pruebas Node, Chrome CDP desktop y móvil, ida/vuelta, `prefers-reduced-motion`, `saveData`, errores JS/404, bytes, decodificaciones aproximadas y rendimiento. La emulación de Chrome **no** equivale a un teléfono real ni autoriza anunciar valores p75.

**G3 · Publicación DEV:** commit reproducible, SHA tree de GitHub igual al local, CI rama success, despliegue Pages success, recursos públicos byte-idénticos. No cambiar BOOT principal sin revisión visual de Javier.

**G4 · Aprobación estética:** Javier aprueba el ritmo, iluminación y transiciones desde URL/MP4. Ningún checkpoint posterior dependiente de esa decisión se declara final.

## C6.8 / DEV-009 · Reproductor sin saltos por espera de imágenes

**Estado:** experimento de rendimiento (no publicar aún en main). Depende de C6.7/DEV-008, que se conserva sin modificar.

**Problema comprobado:** 160 WebP 1080×1080, ~6,77 MB. Con Chrome emulado (CPU x3, RTT 80 ms, 400.000 bytes/s), durante 10 saltos rápidos de scroll de 450 ms el Canvas puede quedar sin frame cercano al cursor; la versión que conserva el último frame puede aparentar un salto o congelamiento. Limitar una cola reduce solicitudes pero no garantiza que la imagen visible esté lista.

**Hipótesis y opciones A/B, en orden:**
1. Mantener la ruta C6.7 pública como control. Variante C6.8-A: purga de colas distantes, prioridad al **destino real** del scroll y límites de caché móviles. Conservar en rama experimento hasta que supere G2.
2. Si la espera visible persiste: probar **derivados móviles de 768–864 px** de los mismos 160 renders (no volver a Blender) y documentar nitidez Retina vs bytes/decodificación. Conservar 1080 en escritorio y cargar solo un tamaño por sesión.
3. Considerar fotogramas ancla cercanos por capítulo como fallback (nunca un póster general durante la toma del AIO); y/o cancelación de solicitudes obsoletas, midiendo efecto y robustez Safari.
4. Evaluar vídeo con seek/scrub (H.264 intra o WebCodecs) únicamente como experimento medido si el método Canvas sigue mostrando bloqueos. No migrar framework por preferencia tecnológica.

**Aceptación técnica sugerida:** misma batería CDP desktop 1440×900 y móvil 440×900: 0 errores/404/overflow, scroll reversible, no pantalla negra, estático correcto. En el ensayo adversarial se busca menos bytes y menos posiciones sin frame cercano respecto de C6.7, **en ambos sentidos**. Registrar tanto el tiempo hasta un frame cercano como la visibilidad real del Canvas; una reducción de requests que aumente los vacíos **no** pasa. En un teléfono real de gama media, revisar memoria, latencia del scrub, temperatura y continuidad visual antes de declarar el gate completo.

**Archivos:** `c6-7-preview.js` (control inmutable), `c6-8-preview.js/html` (candidato aislado), `tests/c6-8-preview.test.mjs`, `docs/PERF-C6-8-2026-11-19.md`; sin nuevos WebP en esta primera variante.

**Rollback:** retirar enlace/versión C6.8 y dejar la URL C6.7 publicada. No tocar assets originales ni LIVE.

## C6.9 / DEV-010 · Encendido, botón principal y vidrio (G1/G2 visuales)

**Dependencia:** conocer el resultado de C6.8 y revisión del material actual por Javier.

**Microtomas propuestas:** apagado → luz de botón/carga cian progresiva → pausa sobre botón principal real → trayectoria descendente sin deformar la tapa → cruce de vidrio → RAM/AIO. Marcadores narrativos de scroll y objetivos de cámara registrables por porcentaje; pose, dirección y velocidad continuas.

**Producción:** duplicar **solo una cámara temporal sin acción** en proceso Blender headless; estudiar con 8–12 frames Cycles RGBA comparados con C6.7; controlar intensidad LED sin “RGB gamer” excesivo, normales/bevels de tapa, contacto de GPU y AIO, óptica del vidrio y bordes transparentes. Evaluar poses tanto en desktop como móvil antes de aumentar densidad.

**Aceptación:** botón principal reconocible y sin secundario, progresión LED claramente distinguible apagado/encendido, ninguna columna estructural desproporcionada durante la entrada, sin círculo de blur ni cuadro opaco pronunciado. Ida/vuelta sin corte. Solo después de aprobación producir nuevos frames finales una vez.

**Archivos:** nuevo script de cámara versionado, capturas G1/G2 y MP4 corto en `04_Revisiones`, manifest de render; no segundo master .blend.

**Rollback:** cámara/materiales C6.7 sin cambios y recuperar la escena canónica.

## C7.0 / DEV-011 · HARDWARE narrativo verificable

**Dependencia:** salida de C6.9 validada. El primer frame del capítulo HARDWARE debe coincidir exactamente con el último de BOOT (pose/iluminación/escala/objetivo).

**Guion corto:** mostrar placa madre → RAM cian → AIO → GPU/ventiladores (sin forzar posiciones físicamente imposibles). Sincronizar microtextos de diagnóstico, mantenimiento, reparación sin atribuir proyectos/cifras inventadas.

**G1:** 6–10 tomas clave y un clip ida/vuelta; no render masivo. **G2:** profundidad y legibilidad del hardware, contraste, scroll inverso, móvil y ahorro de datos. **Entrega:** una ruta DEV separada, storyboard y comparación entre entrada/salida.

**Rollback:** previews conceptuales actuales se mantienen.

## C7.1 / DEV-012 · CONNECT como continuación material de HARDWARE

**Dependencia:** posición final HARDWARE aprobada.

**Transición:** escoger una pista visible de la placa madre; seguimiento de cámara → estilización gradual en líneas de conexión → nodos WiFi, dispositivos, nube y backup. El esquema de CONNECT actual es una **maqueta conceptual**, no la transición terminada.

**Gates:** elegir una única ruta de pista; transición continua con 3–5 keyposes A/B; texto legible; no simular métricas o conexiones de clientes. Fallback accesible/estático. Probar más de un tamaño de pantalla.

**Rollback:** conservar diagrama estático y primer/último frame de HARDWARE.

## C7.2 / DEV-013 · INTELLIGENCE y Portfolio con casos reales

**Dependencia:** CONNECT definido; evidencias y material publicable aprobados por Javier.

**Narrativa:** la red se transforma gradualmente en inteligencia sin ruptura del lenguaje visual; automatizaciones y casos reales sin contraseñas, IDs, cuentas, datos privados o estadísticas inventadas. Si faltan evidencias, mostrar “concepto” y no prometer resultados.

**Gates:** listado de casos autorizados, texto revisado, accesibilidad, reducción de movimiento, preview móvil, consistencia gráfica. No conectar sistemas reales al sitio sin plan de seguridad.

## C7.3 / DEV-014 · CONTACT cinematográfico y QA integral

**Dependencia:** continuidad de C7.2 y canales ya existentes revisados.

**Narrativa:** volver a CORE-01 / SYSTEM EVOLUTION y culminar con WhatsApp, teléfono, formulario y LinkedIn; todos enlaces auditados. No bloquear scroll ni forzar reproducción.

**Gates de publicación:** recorrido completo reversible, contraste/click targets/teclado, fallback/sin JS, móvil, Core Web Vitals medidos cuando haya datos representativos, peso real de descarga, rutas de contacto, screenshots y video de punta a punta. Conservar comparativa y posibilidad de rollback a último DEV verificado.

**LIVE:** absolutamente ningún deploy, merge o cambio en producción antes de decisión separada y explícita de Javier.

## Cómo entregar cada checkpoint

Informe breve al usuario + apéndice técnico en el mismo Issue: estado **implementado / verificado / bloqueado / aprobado**, URL DEV cuando exista, video/imagen real de antes/después, SHAs Blender/Git, tamaño de assets, pruebas Node y navegador, errores/bloqueos con evidencia, lista de cambios, rollback exacto y **un único siguiente checkpoint activo**. Evitar porcentajes generales sin denominador verificable.
