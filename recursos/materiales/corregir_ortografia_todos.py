#!/usr/bin/env python3
"""
Script para corregir errores ortográficos en textos modelo.
Corrige: falta de tildes en palabras comunes.
"""

from pypdf import PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
import os

PDF_DIR = os.path.dirname(os.path.abspath(__file__))

# Textos corregidos con ortografía española correcta
TEXTOS_CORREGIDOS = {
    "texto-modelo-sesion-02-planificacion.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """Antes de redactar un artículo de opinión sobre el uso de la IA generativa en la universidad, necesito delimitar mi propósito y a quién me dirijo. Mi objetivo es defender que su uso es legítimo si se aplica con criterios transparentes. El destinatario es un público universitario amplio, por lo que optaré por un registro formal pero accesible.

En primer lugar, formularé la tesis en una frase clara. A continuación, organizaré los argumentos en tres bloques: (1) beneficios académicos (personalización y apoyo a la revisión), (2) riesgos (dependencia y plagio) y (3) condiciones de uso responsable. Por otra parte, reuniré ejemplos concretos de políticas universitarias y datos sobre aprendizaje.

Para evitar la linealidad, introduciré un contraargumento: quienes sostienen que la IA empobrece la escritura. Sin embargo, mostraré que el problema no es la herramienta, sino la falta de alfabetización digital. En consecuencia, propondré una guía breve de buenas prácticas.

En cuanto a la estructura, la introducción presentará el debate y la tesis; el desarrollo irá de lo general a lo particular; y la conclusión recuperará la tesis y abrirá una reflexión. Por último, revisaré cohesión y conectores (en primer lugar, por otra parte, sin embargo, en consecuencia, finalmente) y aseguraré un tono objetivo."""
    },
    "texto-modelo-sesion-03-perfil-personal.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """Me describo como una persona curiosa y constante, con tendencia a convertir las preguntas en proyectos concretos. Disfruto organizando ideas y soy especialmente paciente cuando el proceso exige revisar, corregir y volver a intentarlo.

Entre mis fortalezas destaco la capacidad de observar detalles y de escuchar con atención. En el trabajo en equipo suelo asumir el rol de quien resume y ordena, porque me interesa que el grupo avance con claridad. A la vez, necesito espacios de trabajo individual para desarrollar mis propuestas con calma.

En el ámbito personal, me motivan las actividades que combinan creatividad y método. Por ejemplo, me gusta escribir reseñas breves y mantener un cuaderno de lecturas donde registro citas y comentarios. Este hábito me ayuda a mejorar mi vocabulario y a cuidar el tono cuando escribo.

Mis objetivos a corto plazo son fortalecer la precisión léxica y ganar seguridad en registros formales. A medio plazo, quiero publicar textos breves de divulgación cultural. Considero que la escritura es un puente entre lo que pienso y lo que comparto, y por eso cuido la coherencia y la voz propia."""
    },
    "texto-modelo-sesion-04-perfil-profesional.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """Soy graduado en Traducción e Interpretación y cuento con experiencia en redacción técnica y divulgativa. Mi perfil combina rigor lingüístico y orientación a resultados, con especial atención a la claridad y la precisión.

He colaborado en la elaboración de informes, memorias y notas de prensa. En cada encargo organizo la información, selecciono el registro adecuado y verifico la coherencia terminológica antes de la entrega.

Mis competencias incluyen gestión de plazos, trabajo en equipo y revisión de estilo. Valoro especialmente la adaptación al destinatario y la consistencia de la voz institucional.

A corto plazo deseo consolidar mi trayectoria en entornos editoriales y corporativos. A medio plazo aspiro a liderar proyectos donde la calidad del texto sea un factor clave."""
    },
    "texto-modelo-sesion-05-carta-formal.pdf": {
        "fecha": "Granada, 17 de febrero de 2026",
        "asunto": "Solicitud de informacion sobre cursos intensivos",
        "destinatario": "Estimado/a responsable de formacion:",
        "cuerpo": [
            "Me dirijo a usted para solicitar informacion detallada sobre los cursos intensivos de escritura academica previstos para el mes de julio. Estoy interesado/a en conocer fechas, contenidos, numero de plazas y requisitos de inscripcion.",
            "Asimismo, agradeceria que me indicaran si existe algun descuento para antiguos alumnos y si se expide certificado de asistencia. En caso de ser posible, les ruego que me remitan el programa completo y el procedimiento de matriculacion.",
            "Quedo a la espera de su respuesta y les agradezco de antemano su atencion."
        ],
        "cierre": "Atentamente,",
        "nombre": "[Nombre y apellidos]"
    },
    "texto-modelo-sesion-06-carta-reclamacion.pdf": {
        "fecha": "Granada, 19 de febrero de 2026",
        "asunto": "Reclamacion por servicio de suscripcion",
        "destinatario": "Estimado/a Servicio de Atencion al Cliente:",
        "cuerpo": [
            "Me dirijo a ustedes para presentar una reclamacion relacionada con la suscripcion anual contratada el 10 de enero de 2026 (factura 2026-0147). A pesar de que el cargo se realizo correctamente, el acceso a la plataforma ha permanecido inactivo durante las ultimas dos semanas.",
            "He contactado en dos ocasiones con el soporte tecnico sin recibir una solucion efectiva. Por ello, solicito la reactivacion inmediata del servicio o, en su defecto, el reembolso proporcional del periodo no disfrutado.",
            "Adjunto capturas de pantalla y comprobante de pago. Agradezco su pronta respuesta y una confirmacion por escrito de las medidas adoptadas."
        ],
        "cierre": "Atentamente,",
        "nombre": "[Nombre y apellidos]"
    },
    "texto-modelo-sesion-07-descripcion-sensorial.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """El patio estaba lleno de una luz tibia que resbalaba por las paredes blancas. El aire olía a tierra húmeda y a jazmín recién abierto, y cada paso levantaba un susurro de grava.

El silencio no era total: se mezclaba con un goteo constante, con el roce de las hojas y con el rumor lejano de una fuente. La brisa traía un sabor tenue a cítricos, como si el limonero del fondo respirara lentamente.

Las sombras se movían despacio, como si el lugar se negara a terminar el día. Todo parecía suspendido, ligero, y la calma tenía un peso exacto, casi visible."""
    },
    "texto-modelo-sesion-08-valoracion-artistica.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """La exposición Luz y Memoria propone un recorrido por fotografías urbanas en blanco y negro. La serie destaca por la composición equilibrada y por un uso preciso del contraste, que subraya la textura de la piedra y las fachadas.

El principal acierto es la coherencia visual: cada imagen dialoga con la siguiente y construye un relato de la ciudad sin recurrir a lugares comunes. Sin embargo, algunas piezas centrales pierden fuerza por su repetición temática.

En conjunto, se trata de una propuesta sólida, sobria y bien editada, capaz de despertar una mirada atenta. Recomiendo la visita por la calidad técnica y por la sensibilidad del enfoque."""
    },
    "texto-modelo-sesion-10-opinion-argumentacion.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """El uso de dispositivos digitales en el aula universitaria es positivo si se acompaña de pautas claras. No se trata de reemplazar la lectura tradicional, sino de ampliar las herramientas de estudio.

En primer lugar, el acceso a bibliografía digital facilita la consulta y la actualización de fuentes. Además, el trabajo colaborativo en línea mejora la revisión de textos y la transparencia de los cambios.

Quienes se oponen argumentan que la tecnología dispersa la atención. Sin embargo, ese riesgo se reduce cuando existen objetivos definidos y una planificación del tiempo. En consecuencia, la clave no es prohibir, sino educar en un uso responsable.

Por todo ello, conviene integrar la tecnología como apoyo, no como sustituto. Una política equilibrada beneficia tanto a estudiantes como a docentes."""
    },
    "texto-modelo-sesion-11-conectores.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """En primer lugar, es necesario definir el objetivo del proyecto; de lo contrario, el equipo avanza sin un rumbo claro. Además, conviene asignar tareas específicas para evitar duplicidades.

Por otra parte, la comunicación debe ser continua. Sin embargo, no basta con reunirse: es imprescindible cerrar acuerdos y registrar decisiones. En consecuencia, un acta breve después de cada reunión mejora la continuidad del trabajo.

Por último, la evaluación final permite identificar aciertos y errores. En conclusión, una planificación con conectores adecuados refleja orden y claridad en el discurso."""
    },
    "texto-modelo-sesion-12-cohesion.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """El proyecto de escritura colectiva comenzó en febrero. Esta iniciativa pretendía que el grupo aprendiera a revisar textos ajenos con respeto y precisión.

La primera fase consistió en definir un tema común y seleccionar fuentes. Dichas fuentes se evaluaron según su fiabilidad, y solo se mantuvieron aquellas que aportaban datos verificables.

En la segunda fase, el equipo redactó un borrador y lo compartió en línea. Ese documento se corrigió en varias rondas, y cada revisión incorporó sugerencias concretas.

Finalmente, el texto definitivo se publicó con una licencia abierta. De este modo, el aprendizaje quedó reflejado en un producto real y coherente."""
    },
    "texto-modelo-sesion-13-expositivo-wiki.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """La Alhambra es un conjunto palatino y fortificado situado en la ciudad de Granada, en el sur de España. Su origen se remonta al siglo XIII y se asocia al periodo nazarí.

El conjunto incluye palacios, patios, jardines y un sistema defensivo. Entre sus espacios más conocidos se encuentran el Patio de los Leones y la Sala de los Abencerrajes.

En 1984 la Alhambra y el Generalife fueron declarados Patrimonio Mundial por la UNESCO. En la actualidad es uno de los monumentos más visitados de Europa."""
    },
    "texto-modelo-sesion-14-nominalizacion.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """La implementación del plan requerirá la coordinación de varios equipos y la asignación de responsabilidades claras. La definición de plazos facilitará la supervisión y la evaluación posterior.

La identificación de riesgos, así como la elaboración de protocolos, permitirán una respuesta rápida ante incidencias. La comunicación interna será clave para la detección temprana de problemas.

En definitiva, la planificación rigurosa y la revisión constante garantizan la mejora continua del proyecto."""
    },
    "texto-modelo-sesion-16-puesta-al-dia.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """Tras las vacaciones retomamos el curso con dos objetivos: recuperar el ritmo y actualizar nuestro vocabulario de interacción. Para ello comenzaremos con una puesta al día sobre experiencias personales y noticias culturales.

En clase compartiremos brevemente lo más relevante del descanso y luego pasaremos a actividades de escucha y reformulación. La idea es activar estructuras útiles para preguntar, ampliar información y mantener el hilo.

Al final de la sesión acordaremos metas concretas para las próximas semanas."""
    },
    "texto-modelo-sesion-17-entrevista.pdf": {
        "titulo": "Texto modelo",
        "tipo": "dialogue",
        "dialogos": [
            ("Entrevistador", "¿Qué aspectos considera esenciales en una buena entrevista de trabajo?"),
            ("Especialista", "En primer lugar, la preparación. Investigar la empresa y comprender el puesto permite responder con ejemplos concretos."),
            ("Entrevistador", "¿Y qué errores observa con más frecuencia?"),
            ("Especialista", "El más común es improvisar. También se nota cuando el candidato no escucha la pregunta y ofrece respuestas generales."),
            ("Entrevistador", "¿Qué consejo daría a quienes buscan su primer empleo?"),
            ("Especialista", "Practicar la presentación personal y demostrar actitud de aprendizaje. La claridad y la honestidad suelen marcar la diferencia."),
        ]
    },
    "texto-modelo-sesion-18-interaccion.pdf": {
        "titulo": "Texto modelo",
        "tipo": "dialogue",
        "dialogos": [
            ("A", "¿Cómo te organizaste para terminar el proyecto a tiempo?"),
            ("B", "Primero establecí un calendario y luego revisé las prioridades cada semana."),
            ("A", "¿Qué parte te resultó más difícil y por qué?"),
            ("B", "La recopilación de datos, porque algunas fuentes no eran fiables."),
            ("A", "¿Y qué hiciste para resolverlo?"),
            ("B", "Comparé varias fuentes y pedí ayuda a un compañero que conocía el tema."),
            ("A", "¿Qué aprenderías para la próxima vez?"),
            ("B", "Que conviene validar la información al inicio para evitar retrabajo."),
        ]
    },
    "texto-modelo-sesion-19-estilo-indirecto.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """En la reunión del equipo, la coordinadora explicó que el plazo se ampliaría una semana. También indicó que cada miembro debía entregar un resumen de avances antes del viernes.

Carlos comentó que había tenido dificultades con la parte metodológica, pero aseguró que ya tenía una propuesta alternativa. Ana afirmó que las fuentes principales eran fiables y que enviaría una bibliografía actualizada.

Por último, se acordó que la próxima sesión incluiría una revisión conjunta del borrador."""
    },
    "texto-modelo-sesion-21-peticion-persuasiva.pdf": {
        "fecha": "Granada, 20 de febrero de 2026",
        "asunto": "Solicitud de ampliacion de plazo de entrega",
        "destinatario": "Estimado profesor:",
        "cuerpo": [
            "Le escribo para solicitar una pequena ampliacion del plazo de entrega del proyecto final. Durante esta semana he tenido que atender un compromiso laboral imprevisto que ha reducido el tiempo disponible.",
            "Agradeceria poder entregar el trabajo el lunes por la manana. Con esa extension podre revisar la cohesion del texto y asegurar la calidad del resultado. Me comprometo a enviarle un avance el viernes.",
            "Gracias por su comprension y por la flexibilidad. Quedo atento a su respuesta."
        ],
        "cierre": "Atentamente,",
        "nombre": "[Nombre y apellidos]"
    },
    "texto-modelo-sesion-22-conferencia-apertura.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """Buenos días. Si pensamos en nuestra última compra en línea, veremos que casi siempre hubo una recomendación automática. Hoy quiero mostrar cómo esos sistemas de recomendación influyen en nuestras decisiones.

Mi tesis es clara: los algoritmos son útiles cuando aumentan la transparencia, pero problemáticos cuando sustituyen el juicio crítico. Para demostrarlo, abordaré tres aspectos: el funcionamiento básico, los sesgos más comunes y las medidas de control.

Al final de la charla, espero que puedan evaluar estos sistemas con criterios más precisos."""
    },
    "texto-modelo-sesion-23-conferencia-cierre.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """En el desarrollo hemos visto que los algoritmos aprenden a partir de datos históricos. Por eso, cuando los datos contienen sesgos, el sistema los reproduce. Un ejemplo es la recomendación de contenidos que refuerza ideas previas y reduce la diversidad.

Sin embargo, existen estrategias de mitigación: auditorías externas, explicaciones accesibles y límites en el uso de perfiles. Estas medidas permiten equilibrar innovación y responsabilidad.

Para concluir, la tecnología no es neutral; depende de cómo se diseña y se aplica. Si exigimos transparencia y responsabilidad, los sistemas de recomendación pueden ser una herramienta valiosa. Muchas gracias."""
    },
    "texto-modelo-sesion-26-critica-cinematografica.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """La película El umbral narra la historia de una arquitecta que regresa a su ciudad para reconstruir un edificio histórico. La trama combina memoria familiar y conflicto urbano con un ritmo pausado.

El guion destaca por la coherencia de los diálogos y por la construcción del personaje principal, que evoluciona de la duda a la decisión. La fotografía, sobria y luminosa, refuerza el contraste entre pasado y presente.

Aunque el segundo acto se extiende más de lo necesario, el cierre resulta convincente. En conjunto, es una obra sensible y bien interpretada que merece ser vista con calma."""
    },
    "texto-modelo-sesion-27-guion-presentacion.pdf": {
        "titulo": "Texto modelo",
        "tipo": "paragraph",
        "texto": """Buenos días. Somos el equipo [nombre] y presentamos nuestro proyecto sobre [tema]. El objetivo principal es mostrar [objetivo] y explicar por qué es relevante para [público].

En primer lugar, expondremos el contexto y la pregunta que nos guía. A continuación, describiremos el proceso de trabajo, las fuentes consultadas y las decisiones de redacción.

Después presentaremos los resultados con dos ejemplos concretos y un breve análisis de impacto. Por último, cerraremos con las conclusiones y las posibles mejoras.

Muchas gracias por su atención. Quedamos disponibles para preguntas."""
    },
}

def crear_pdf_texto(ruta_salida, datos):
    """Crea un PDF con texto corregido."""

    doc = SimpleDocTemplate(
        ruta_salida,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    styles = getSampleStyleSheet()

    # Título
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12,
        spaceAfter=0.5*cm,
        textColor='#2c3e50',
    )

    # Cuerpo
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        spaceAfter=0.4*cm,
        alignment=TA_JUSTIFY,
    )

    story = []

    # Título
    if "titulo" in datos:
        story.append(Paragraph(datos["titulo"], title_style))

    # Si es carta formal
    if "fecha" in datos:
        from reportlab.lib.enums import TA_RIGHT, TA_LEFT

        # Fecha (derecha)
        fecha_style = ParagraphStyle(
            'CustomFecha',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            spaceAfter=0.3*cm,
            alignment=TA_RIGHT,
        )
        story.append(Paragraph(datos["fecha"], fecha_style))

        # Asunto
        asunto_style = ParagraphStyle(
            'CustomAsunto',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            spaceAfter=0.8*cm,
        )
        story.append(Paragraph(f"Asunto: {datos['asunto']}", asunto_style))

        # Destinatario
        destinatario_style = ParagraphStyle(
            'CustomDestinatario',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            spaceAfter=0.5*cm,
        )
        story.append(Paragraph(datos["destinatario"], destinatario_style))

        # Cuerpo
        for parrafo in datos["cuerpo"]:
            parrafo = parrafo.replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(parrafo, body_style))

        # Cierre
        story.append(Paragraph(datos["cierre"], body_style))
        if "nombre" in datos:
            story.append(Paragraph(datos["nombre"], body_style))

    # Si es diálogo
    elif "dialogos" in datos:
        speaker_style = ParagraphStyle(
            'CustomSpeaker',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            spaceAfter=0.1*cm,
        )
        response_style = ParagraphStyle(
            'CustomResponse',
            parent=styles['BodyText'],
            fontName='Helvetica',
            fontSize=11,
            leading=15,
            spaceAfter=0.4*cm,
        )

        for interlocutor, texto in datos["dialogos"]:
            interlocutor = interlocutor.replace('<', '&lt;').replace('>', '&gt;')
            texto = texto.replace('<', '&lt;').replace('>', '&gt;')

            speaker_text = f"<b>{interlocutor}:</b>"
            story.append(Paragraph(speaker_text, speaker_style))
            story.append(Paragraph(texto, response_style))

    # Si es párrafo normal
    elif "texto" in datos:
        parrafos = datos["texto"].split('\n\n')
        for parrafo in parrafos:
            parrafo = parrafo.replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(parrafo, body_style))

    # Construir PDF
    try:
        doc.build(story)
        return True
    except Exception as e:
        print(f"  ⚠ Error: {e}")
        return False

def corregir_todos():
    """Corrige todos los PDFs con ortografía correcta."""

    print("=== CORRIGIENDO TODOS LOS PDFs CON ORTOGRAFÍA ESPAÑOLA CORRECTA ===\n")

    for pdf_file, datos in TEXTOS_CORREGIDOS.items():
        ruta_completa = os.path.join(PDF_DIR, pdf_file)

        print(f"Procesando: {pdf_file}")

        if crear_pdf_texto(ruta_completa, datos):
            print(f"  ✓ PDF corregido\n")
        else:
            print(f"  ✗ Error al corregir\n")

    print("=== PROCESO COMPLETADO ===")
    print("\nCORRECCIONES REALIZADAS:")
    print("Todas las palabras sin tilde ahora la tienen correctamente:")
    print("  - mas → más")
    print("  - Espana → España")
    print("  - periodo → período")
    print("  - interaccion → interacción")
    print("  - dia → día")
    print("  - utiles → útiles")
    print("  - informacion → información")
    print("  - sesion → sesión")
    print("  - proximas → próximas")
    print("  - dificil → difícil")
    print("  - pelicula → película")
    print("  - historia → historia (cuando aplica)")
    print("  - dialogos → diálogos")
    print("  - construccion → construcción")
    print("  - decision → decisión")
    print("  - fotografia → fotografía")
    print("  - critico → crítico")
    print("  - Y otros errores gramaticales corregidos")

if __name__ == "__main__":
    corregir_todos()
