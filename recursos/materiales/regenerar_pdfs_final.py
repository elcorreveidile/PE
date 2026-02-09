#!/usr/bin/env python3
"""
Regenera los PDFs de textos modelo con formato correcto de párrafos.
Este script detecta automáticamente los párrafos basándose en:
- Líneas que empiezan con mayúscula después de un punto
- Marcadores de inicio de párrafo comunes en español
- Máximo de oraciones por párrafo (3-4)
"""

from pypdf import PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
import os
import re

# Configuración
PDF_DIR = os.path.dirname(os.path.abspath(__file__))

# Lista completa de PDFs
PDFS_LIST = [
    ("texto-modelo-sesion-02-planificacion.pdf", "paragraph"),
    ("texto-modelo-sesion-03-perfil-personal.pdf", "paragraph"),
    ("texto-modelo-sesion-04-perfil-profesional.pdf", "paragraph"),
    ("texto-modelo-sesion-05-carta-formal.pdf", "letter"),
    ("texto-modelo-sesion-06-carta-reclamacion.pdf", "letter"),
    ("texto-modelo-sesion-07-descripcion-sensorial.pdf", "paragraph"),
    ("texto-modelo-sesion-08-valoracion-artistica.pdf", "paragraph"),
    ("texto-modelo-sesion-10-opinion-argumentacion.pdf", "paragraph"),
    ("texto-modelo-sesion-11-conectores.pdf", "paragraph"),
    ("texto-modelo-sesion-12-cohesion.pdf", "paragraph"),
    ("texto-modelo-sesion-13-expositivo-wiki.pdf", "paragraph"),
    ("texto-modelo-sesion-14-nominalizacion.pdf", "paragraph"),
    ("texto-modelo-sesion-16-puesta-al-dia.pdf", "paragraph"),
    ("texto-modelo-sesion-17-entrevista.pdf", "dialogue"),
    ("texto-modelo-sesion-18-interaccion.pdf", "dialogue"),
    ("texto-modelo-sesion-19-estilo-indirecto.pdf", "paragraph"),
    ("texto-modelo-sesion-21-peticion-persuasiva.pdf", "letter"),
    ("texto-modelo-sesion-22-conferencia-apertura.pdf", "paragraph"),
    ("texto-modelo-sesion-23-conferencia-cierre.pdf", "paragraph"),
    ("texto-modelo-sesion-26-critica-cinematografica.pdf", "paragraph"),
    ("texto-modelo-sesion-27-guion-presentacion.pdf", "paragraph"),
]

# Marcadores que inician nuevos párrafos
MARCADORES_PARRAFO = [
    r'^En primer lugar',
    r'^Por otra parte',
    r'^Sin embargo',
    r'^En consecuencia',
    r'^Por último',
    r'^Por todo ello',
    r'^En cuanto a',
    r'^Asimismo',
    r'^Para evitar',
    r'^Para concluir',
    r'^En resumen',
    r'^En definitiva',
    r'^Finalmente',
    r'^Además',
    r'^Antes de',
    r'^Durante',
    r'^Después',
    r'^Por un lado',
    r'^Por otro lado',
    r'^En efecto',
    r'^No obstante',
    r'^De este modo',
    r'^Así pues',
    r'^Quienes\s+\w+',
    r'^Granada,',
    r'^Madrid,',
    r'^Barcelona,',
    r'^\d{1,2}\s+de\s+\w+,',
    r'^Estimado',
    r'^A quien corresponda',
    r'^En la',
    r'^En el',
    r'^Los',
    r'^Las',
    r'^Esta',
    r'^Este',
    r'^Mi\s+\w+',
    r'^Entre',
    r'^A\s+ corto',
    r'^A\s+ medio',
    r'^El\s+principal',
    r'^Aunque',
    r'^Para',
    r'^Si\s+',
    r'^Mi\s+',
    r'^En\s+',
]

def dividir_en_parrafos_mejorado(texto):
    """Divide el texto en párrafos usando lógica mejorada."""

    # Eliminar "Texto modelo: ..." al inicio
    texto = re.sub(r'^Texto modelo:[^\n]*\n?', '', texto)

    # Dividir el texto en líneas (preservando estructura original)
    lineas = texto.split('\n')

    parrafos = []
    parrafo_actual = []

    for linea in lineas:
        linea = linea.strip()
        if not linea:
            # Línea vacía: fin de párrafo
            if parrafo_actual:
                parrafos.append(' '.join(parrafo_actual))
                parrafo_actual = []
            continue

        # Verificar si esta línea inicia un nuevo párrafo
        es_nuevo_parrafo = False

        # 1. Empieza con un marcador de párrafo
        for patron in MARCADORES_PARRAFO:
            if re.match(patron, linea, re.IGNORECASE):
                es_nuevo_parrafo = True
                break

        # 2. Empieza con mayúscula y tenemos suficiente contenido en el párrafo actual
        # (más de 15 palabras aprox)
        if not es_nuevo_parrafo and parrafo_actual:
            palabras_actuales = len(' '.join(parrafo_actual).split())
            if linea[0].isupper() and palabras_actuales > 15:
                # Excepciones: no es nuevo párrafo si es continuación obvia
                if not re.match(r'^(La|El|Los|Las|Esta|Este|Esa|Eso|Un|Una|Unos|Unas)\s+(misma|misma|misma|misma|misma)\s+', linea, re.IGNORECASE):
                    es_nuevo_parrafo = True

        # 3. Para diálogos: Empieza con "Entrevistador:", "Especialista:", etc.
        if re.match(r'^(Entrevistador|Especialista|A|B|Periodista|Autor):', linea):
            es_nuevo_parrafo = True

        if es_nuevo_parrafo and parrafo_actual:
            parrafos.append(' '.join(parrafo_actual))
            parrafo_actual = [linea]
        else:
            parrafo_actual.append(linea)

    # Agregar el último párrafo
    if parrafo_actual:
        parrafos.append(' '.join(parrafo_actual))

    return parrafos

def extraer_texto_pdf(ruta_pdf):
    """Extrae el texto de un PDF backup."""
    try:
        reader = PdfReader(ruta_pdf)
        texto = ""
        for page in reader.pages:
            texto += page.extract_text() + "\n"
        return texto.strip()
    except Exception as e:
        print(f"  ⚠ Error extrayendo texto: {e}")
        return None

def crear_pdf_con_texto(ruta_salida, texto, tipo_texto):
    """Crea un PDF con el texto usando formato correcto."""

    # Crear el documento
    doc = SimpleDocTemplate(
        ruta_salida,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    # Estilos
    styles = getSampleStyleSheet()

    # Título
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12,
        spaceAfter=0.3*cm,
        textColor='#2c3e50',
        alignment=TA_LEFT,
    )

    # Cuerpo del texto
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        spaceAfter=0.4*cm,
        alignment=TA_JUSTIFY,
    )

    # Diálogos
    dialogue_style = ParagraphStyle(
        'CustomDialogue',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        spaceAfter=0.3*cm,
        alignment=TA_LEFT,
    )

    # Construir contenido
    story = []

    # Título
    story.append(Paragraph("Texto modelo", title_style))

    # Dividir en párrafos
    parrafos = dividir_en_parrafos_mejorado(texto)

    # Agregar párrafos
    estilo = dialogue_style if tipo_texto == "dialogue" else body_style

    for parrafo in parrafos:
        parrafo = parrafo.strip()
        if parrafo:
            # Limpiar espacios múltiples
            parrafo = re.sub(r'\s+', ' ', parrafo)
            # Escapar caracteres especiales
            parrafo = parrafo.replace('<', '&lt;').replace('>', '&gt;')

            # Resaltar ciertos elementos
            if parrafo.startswith('Asunto:'):
                parrafo = f'<b>{parrafo}</b>'
            elif re.match(r'^(Entrevistador|Especialista):', parrafo):
                parrafo = f'<b>{parrafo}</b>'

            story.append(Paragraph(parrafo, estilo))

    # Construir PDF
    try:
        doc.build(story)
        return True
    except Exception as e:
        print(f"  ⚠ Error creando PDF: {e}")
        return False

def regenerar_todos():
    """Regenera todos los PDFs."""

    print("=== REGENERANDO TODOS LOS PDFs CON FORMATO CORRECTO ===\n")

    for pdf_file, tipo in PDFS_LIST:
        ruta_completa = os.path.join(PDF_DIR, pdf_file)
        backup_file = ruta_completa + ".backup"

        print(f"Procesando: {pdf_file}")
        print(f"  Tipo: {tipo}")

        if not os.path.exists(backup_file):
            print(f"  ⚠ No hay backup. Omitiendo.\n")
            continue

        # Extraer texto
        texto = extraer_texto_pdf(backup_file)
        if not texto:
            print(f"  ✗ Error extrayendo texto.\n")
            continue

        # Crear PDF
        if crear_pdf_con_texto(ruta_completa, texto, tipo):
            print(f"  ✓ PDF regenerado\n")
        else:
            print(f"  ✗ Error al regenerar\n")

    print("=== PROCESO COMPLETADO ===")

if __name__ == "__main__":
    regenerar_todos()
