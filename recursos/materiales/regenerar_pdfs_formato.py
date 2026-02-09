#!/usr/bin/env python3
"""
Regenera los PDFs de textos modelo con formato mejorado:
- Párrafos bien separados
- Estructura clara
- Márgenes adecuados
"""

from pypdf import PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_JUSTIFY
import os
import re

# Configuración
PDF_DIR = os.path.dirname(os.path.abspath(__file__))

# Lista de PDFs a regenerar con configuración específica
# Formato: (archivo_pdf, titulo, tipo, texto_predefinido_opcional)
PDFS_CONFIG = [
    # Si hay texto predefinido mejor formateado, úsalo. Si no, extrae del backup.
    ("texto-modelo-sesion-05-carta-formal.pdf", "Sesión 5: Carta formal", "letter", """Granada, 17 de febrero de 2026

Asunto: Solicitud de informacion sobre cursos intensivos

Estimado/a responsable de formacion:

Me dirijo a usted para solicitar informacion detallada sobre los cursos intensivos de escritura academica previstos para el mes de julio. Estoy interesado/a en conocer fechas, contenidos, numero de plazas y requisitos de inscripcion.

Asimismo, agradeceria que me indicaran si existe algun descuento para antiguos alumnos y si se expide certificado de asistencia. En caso de ser posible, les ruego que me remitan el programa completo y el procedimiento de matriculacion.

Quedo a la espera de su respuesta y les agradezco de antemano su atencion.

Atentamente,

[Nombre y apellidos]"""),
]

# Lista de PDFs restantes (sin texto predefinido)
PDFS_RESTANTES = [
    ("texto-modelo-sesion-02-planificacion.pdf", "Sesión 2: Planificación", "paragraph"),
    ("texto-modelo-sesion-03-perfil-personal.pdf", "Sesión 3: Perfil personal", "paragraph"),
    ("texto-modelo-sesion-04-perfil-profesional.pdf", "Sesión 4: Perfil profesional", "paragraph"),
    ("texto-modelo-sesion-06-carta-reclamacion.pdf", "Sesión 6: Carta de reclamación", "letter"),
    ("texto-modelo-sesion-07-descripcion-sensorial.pdf", "Sesión 7: Descripción sensorial", "paragraph"),
    ("texto-modelo-sesion-08-valoracion-artistica.pdf", "Sesión 8: Valoración artística", "paragraph"),
    ("texto-modelo-sesion-10-opinion-argumentacion.pdf", "Sesión 10: Opinión argumentativa", "paragraph"),
    ("texto-modelo-sesion-11-conectores.pdf", "Sesión 11: Conectores", "paragraph"),
    ("texto-modelo-sesion-12-cohesion.pdf", "Sesión 12: Cohesión", "paragraph"),
    ("texto-modelo-sesion-13-expositivo-wiki.pdf", "Sesión 13: Expositivo wiki", "paragraph"),
    ("texto-modelo-sesion-14-nominalizacion.pdf", "Sesión 14: Nominalización", "paragraph"),
    ("texto-modelo-sesion-16-puesta-al-dia.pdf", "Sesión 16: Puesta al día", "paragraph"),
    ("texto-modelo-sesion-17-entrevista.pdf", "Sesión 17: Entrevista", "dialogue"),
    ("texto-modelo-sesion-18-interaccion.pdf", "Sesión 18: Interacción", "dialogue"),
    ("texto-modelo-sesion-19-estilo-indirecto.pdf", "Sesión 19: Estilo indirecto", "paragraph"),
    ("texto-modelo-sesion-21-peticion-persuasiva.pdf", "Sesión 21: Petición persuasiva", "letter"),
    ("texto-modelo-sesion-22-conferencia-apertura.pdf", "Sesión 22: Conferencia apertura", "speech"),
    ("texto-modelo-sesion-23-conferencia-cierre.pdf", "Sesión 23: Conferencia cierre", "speech"),
    ("texto-modelo-sesion-26-critica-cinematografica.pdf", "Sesión 26: Crítica cinematográfica", "paragraph"),
    ("texto-modelo-sesion-27-guion-presentacion.pdf", "Sesión 27: Guion presentación", "paragraph"),
]

def dividir_en_parrafos_inteligente(texto):
    """Divide el texto en párrafos usando patrones lingüísticos del español."""

    # Patrones que inician nuevos párrafos
    marcadores_parrafo = [
        r'\bEn primer lugar\b',
        r'\bPor otra parte\b',
        r'\bSin embargo\b',
        r'\bEn consecuencia\b',
        r'\bPor último\b',
        r'\bPor todo ello\b',
        r'\bEn cuanto a\b',
        r'\bAsimismo\b',
        r'\bPara evitar\b',
        r'\bPara concluir\b',
        r'\bEn resumen\b',
        r'\bFinalmente\b',
        r'\bAdemás\b',
        r'\bAntes de\b',
        r'\bDurante\b',
        r'\bDespués\b',
        r'\bPor un lado\b',
        r'\bPor otro lado\b',
        r'\bEn efecto\b',
        r'\bNo obstante\b',
        r'\bDe este modo\b',
        r'\bAsí pues\b',
        r'\bQuienes\s+\w+\b',
        r'^Granada,',
        r'^Madrid,',
        r'^Barcelona,',
        r'^\d{1,2}\s+de\s+\w+,',
        r'^Estimado',
        r'^A quien corresponda',
    ]

    # Primero, dividir por oraciones
    oraciones = re.split(r'(?<=[.!?])\s+', texto)

    parrafos = []
    parrafo_actual = []

    for oracion in oraciones:
        oracion = oracion.strip()
        if not oracion:
            continue

        # Verificar si esta oración inicia un nuevo párrafo
        es_inicio_parrafo = False

        for patron in marcadores_parrafo:
            if re.search(patron, oracion, re.IGNORECASE):
                es_inicio_parrafo = True
                break

        # También si hay 3 o más oraciones en el párrafo actual y esta empieza con mayúscula
        if len(parrafo_actual) >= 3 and oracion[0].isupper():
            es_inicio_parrafo = True

        if es_inicio_parrafo and parrafo_actual:
            parrafos.append('. '.join(parrafo_actual) + '.')
            parrafo_actual = [oracion]
        else:
            # Si la oración ya termina con punto, no agregar otro
            if oracion.endswith('.'):
                parrafo_actual.append(oracion[:-1])
            else:
                parrafo_actual.append(oracion)

    # Agregar el último párrafo
    if parrafo_actual:
        parrafos.append('. '.join(parrafo_actual) + '.')

    return parrafos

def extraer_texto_pdf(ruta_pdf):
    """Extrae el texto de un PDF existente."""
    try:
        reader = PdfReader(ruta_pdf)
        texto = ""
        for page in reader.pages:
            texto += page.extract_text() + "\n"
        return texto.strip()
    except Exception as e:
        print(f"  ⚠ Error extrayendo texto: {e}")
        return None

def crear_pdf_con_texto(ruta_salida, texto, titulo, tipo_texto):
    """Crea un nuevo PDF con el texto usando formato mejorado."""

    # Crear el documento
    doc = SimpleDocTemplate(
        ruta_salida,
        pagesize=A4,
        rightMargin=2.5*cm,
        leftMargin=2.5*cm,
        topMargin=2.5*cm,
        bottomMargin=2.5*cm,
    )

    # Estilos
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

    # Subtítulo
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading3'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        spaceAfter=0.8*cm,
        textColor='#7f8c8d',
    )

    # Cuerpo del texto - párrafos justificados
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=11,
        leading=17,  # Espaciado entre líneas
        spaceAfter=0.5*cm,  # Espaciado entre párrafos
        alignment=TA_JUSTIFY,  # Justificado
    )

    # Construir el contenido
    story = []

    # Limpiar el texto: eliminar "Texto modelo:" si está al inicio
    texto_limpio = re.sub(r'^Texto modelo:\s*', '', texto)

    # Si el texto ya viene con saltos de línea bien definidos, usarlos
    if '\n\n' in texto_limpio or tipo_texto == "letter":
        # Usar saltos de línea dobles como separadores de párrafo
        parrafos_crudos = texto_limpio.split('\n\n')
        for parrafo in parrafos_crudos:
            parrafo = parrafo.strip()
            if parrafo:
                # Limpiar espacios múltiples
                parrafo = re.sub(r'\s+', ' ', parrafo)
                # Escapar caracteres especiales
                parrafo = parrafo.replace('<', '&lt;').replace('>', '&gt;')

                # Detectar líneas especiales
                if parrafo.startswith('Asunto:'):
                    parrafo = f'<b>{parrafo}</b>'
                elif re.match(r'^(Entrevistador|Especialista):', parrafo):
                    parrafo = f'<b>{parrafo}</b>'

                story.append(Paragraph(parrafo, body_style))
    else:
        # Usar división inteligente en párrafos
        parrafos = dividir_en_parrafos_inteligente(texto_limpio)
        for parrafo in parrafos:
            parrafo = parrafo.strip()
            if parrafo:
                parrafo = re.sub(r'\s+', ' ', parrafo)
                parrafo = parrafo.replace('<', '&lt;').replace('>', '&gt;')
                story.append(Paragraph(parrafo, body_style))

    # Construir el PDF
    try:
        doc.build(story)
        return True
    except Exception as e:
        print(f"  ⚠ Error creando PDF: {e}")
        return False

def regenerar_pdfs():
    """Regenera todos los PDFs de textos modelo."""

    print("=== REGENERANDO PDFs CON FORMATO DE PÁRRAFOS MEJORADO ===\n")

    # Procesar PDFs con texto predefinido
    for pdf_file, titulo, tipo, texto_predefinido in PDFS_CONFIG:
        ruta_completa = os.path.join(PDF_DIR, pdf_file)

        print(f"Procesando: {titulo}")
        print(f"  Archivo: {pdf_file}")
        print(f"  Tipo: {tipo}")
        print(f"  Usando texto predefinido mejorado")

        if crear_pdf_con_texto(ruta_completa, texto_predefinido, titulo, tipo):
            print(f"  ✓ PDF regenerado\n")
        else:
            print(f"  ✗ Error al regenerar PDF\n")

    # Procesar PDFs restantes (extraer del backup)
    for pdf_file, titulo, tipo in PDFS_RESTANTES:
        ruta_completa = os.path.join(PDF_DIR, pdf_file)
        backup_file = ruta_completa + ".backup"

        print(f"Procesando: {titulo}")
        print(f"  Archivo: {pdf_file}")
        print(f"  Tipo: {tipo}")

        if not os.path.exists(backup_file):
            print(f"  ⚠ No se encontró backup. Omitiendo.\n")
            continue

        # Extraer texto del backup
        texto = extraer_texto_pdf(backup_file)

        if not texto:
            print(f"  ✗ No se pudo extraer texto. Omitiendo.\n")
            continue

        # Crear nuevo PDF con el texto
        if crear_pdf_con_texto(ruta_completa, texto, titulo, tipo):
            print(f"  ✓ PDF regenerado\n")
        else:
            print(f"  ✗ Error al regenerar PDF\n")

    print("=== PROCESO COMPLETADO ===")

if __name__ == "__main__":
    regenerar_pdfs()
