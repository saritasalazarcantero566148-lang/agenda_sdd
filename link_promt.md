[Stitch \- Design with AI](https://stitch.withgoogle.com/home?pli=1)   
[Colores pastel: nombres, códigos HEX y paletas pasteles (+40)](https://paletadecolores.org/pastel.html) 

Actúa como un diseñador UI/UX senior con experiencia en identidad visual retro y sistemas de color para interfaces web. Tu tarea es diseñar la interfaz de un gestor de tareas y compromisos con estética vintage, usando exclusivamente la siguiente paleta de tonos pastel definida como variables CSS:

\`\`\`css  
:root {  
  \--pastel-1: \#FFB7CE;  
  \--pastel-2: \#E0B0FF;  
  \--pastel-3: \#BFE3F2;  
  \--pastel-4: \#FDFD96;  
  \--pastel-5: \#AAF0D1;  
}  
\`\`\`

\#\# Requisito de proporción de color

El color blanco debe ocupar aproximadamente el 60% de la superficie visual del diseño. Los cinco tonos pastel reparten el 40% restante como acentos, y ningún pastel debe dominar sobre el blanco. Usa el blanco como fondo base predominante y los pasteles para elementos de jerarquía como botones, encabezados, tarjetas destacadas, iconos, etiquetas o bordes.

\#\# Modelo de dominio que la interfaz debe representar

\*\*Entidad Tarea (Task):\*\*  
\- \`id\` (UUID, requerido, único)  
\- \`titulo\` (String, requerido, máx. 100 caracteres)  
\- \`descripcion\` (String, opcional, máx. 500 caracteres)  
\- \`fechaVencimiento\` (DateTime, requerido)  
\- \`prioridad\` (Enum: BAJA, MEDIA, ALTA, CRITICA)  
\- \`estado\` (Enum: PENDIENTE, EN\_PROCESO, COMPLETADA, CANCELADA)  
\- \`etiquetas\` (List, opcional; ej. "Trabajo", "Personal")

\*\*Entidad Compromiso (Commitment):\*\*  
\- \`id\` (UUID, requerido, único)  
\- \`titulo\` (String, requerido, máx. 100 caracteres)  
\- \`descripcion\` (String, opcional)  
\- \`fechaInicio\` (DateTime, requerido)  
\- \`fechaFin\` (DateTime, requerido; debe ser posterior a \`fechaInicio\`)  
\- \`ubicacion\` (String, opcional; enlace virtual o dirección física)  
\- \`participantes\` (List, requerido; correos de los asistentes, mínimo 1, incluido el creador)  
\- \`estado\` (Enum: PROGRAMADO, CONFIRMADO, CANCELADO)  
\- \`minutosRecordatorio\` (Integer, default: 15\)

Los componentes de la interfaz deben reflejar estos campos, restricciones y enumeraciones: que se vean los estados y prioridades de forma diferenciada, que los campos con límite de caracteres lo respeten en los formularios, y que la validación de \`fechaFin \> fechaInicio\` sea evidente para el usuario.

\#\# Entrega técnica

Entrega el resultado como código HTML y CSS funcional que aproveche las variables \`--pastel-1\` a \`--pastel-5\` mediante \`var()\`, incluyendo una variable para el blanco que respete la proporción indicada.

Aplica la estética vintage mediante recursos como tipografías de corte clásico o serif con carácter retro, bordes redondeados suaves o con líneas finas tipo papel antiguo, sombras discretas, texturas sutiles y ornamentos geométricos o de época, sin que estos recursos compitan con la proporción de color. Cuida el contraste de texto para que sea legible sobre los fondos pastel, y procura que la interfaz sea responsive.

Si el diseño incluye componentes interactivos, define estados de hover y foco visibles que mantengan la paleta. Antes de entregar el código, verifica que el blanco efectivamente cubra cerca del 60% del área visual y ajusta si es necesario.

antes de iniciar aplica el ciclo de vida de desarrollo de software cascada, domando los dos archivos que tienes activos sdd-agenda-tareas y design.md, tcnoligs es node, js vanilla, bootstrap, sqlite

[Me equivoqué, NO uses Spec Driven Development](https://www.youtube.com/watch?v=5JjuF1zpNbI)   
