#!/usr/bin/env python3
"""
Regenera los PDFs de textos modelo usando fuentes Unicode que soportan
caracteres españoles (á, é, í, ó, ú, ñ, ¿, ¡) correctamente.
"""

from pypdf import PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
import re

# Configuración
PDF_DIR = os.path.dirname(os.path.abspath(__file__))

# Lista de PDFs a regenerar
PDFS_TO_REGENERATE = [
    ("texto-modelo-sesion-02-planificacion.pdf", "Sesión 2: Planificación"),
    ("texto-modelo-sesion-03-perfil-personal.pdf", "Sesión 3: Perfil personal"),
    ("texto-modelo-sesion-04-perfil-profesional.pdf", "Sesión 4: Perfil profesional"),
    ("texto-modelo-sesion-05-carta-formal.pdf", "Sesión 5: Carta formal"),
    ("texto-modelo-sesion-06-carta-reclamacion.pdf", "Sesión 6: Carta de reclamación"),
    ("texto-modelo-sesion-07-descripcion-sensorial.pdf", "Sesión 7: Descripción sensorial"),
    ("texto-modelo-sesion-08-valoracion-artistica.pdf", "Sesión 8: Valoración artística"),
    ("texto-modelo-sesion-10-opinion-argumentacion.pdf", "Sesión 10: Opinión argumentativa"),
    ("texto-modelo-sesion-11-conectores.pdf", "Sesión 11: Conectores"),
    ("texto-modelo-sesion-12-cohesion.pdf", "Sesión 12: Cohesión"),
    ("texto-modelo-sesion-13-expositivo-wiki.pdf", "Sesión 13: Expositivo wiki"),
    ("texto-modelo-sesion-14-nominalizacion.pdf", "Sesión 14: Nominalización"),
    ("texto-modelo-sesion-16-puesta-al-dia.pdf", "Sesión 16: Puesta al día"),
    ("texto-modelo-sesion-17-entrevista.pdf", "Sesión 17: Entrevista"),
    ("texto-modelo-sesion-18-interaccion.pdf", "Sesión 18: Interacción"),
    ("texto-modelo-sesion-19-estilo-indirecto.pdf", "Sesión 19: Estilo indirecto"),
    ("texto-modelo-sesion-21-peticion-persuasiva.pdf", "Sesión 21: Petición persuasiva"),
    ("texto-modelo-sesion-22-conferencia-apertura.pdf", "Sesión 22: Conferencia apertura"),
    ("texto-modelo-sesion-23-conferencia-cierre.pdf", "Sesión 23: Conferencia cierre"),
    ("texto-modelo-sesion-26-critica-cinematografica.pdf", "Sesión 26: Crítica cinematográfica"),
    ("texto-modelo-sesion-27-guion-presentacion.pdf", "Sesión 27: Guion presentación"),
]

def limpiar_texto(texto):
    """Limpia el texto extraído del PDF, eliminando espacios y saltos de línea extra."""
    # Eliminar espacios múltiples
    texto = re.sub(r'\s+', ' ', texto)
    # Eliminar espacios antes de signos de puntuación
    texto = re.sub(r'\s+([.,;!?:)])', r'\1', texto)
    # Corregir paréntesis
    texto = texto.replace('( ', '(').replace(' )', ')')
    return texto.strip()

def extraer_texto_pdf(ruta_pdf):
    """Extrae el texto de un PDF existente."""
    try:
        reader = PdfReader(ruta_pdf)
        texto = ""
        for page in reader.pages:
            texto += page.extract_text() + "\n"
        return limpiar_texto(texto)
    except Exception as e:
        print(f"  ⚠ Error extrayendo texto: {e}")
        return None

def crear_pdf_con_texto(ruta_salida, texto, titulo):
    """Crea un nuevo PDF con el texto usando fuentes Unicode."""

    # Crear el documento
    doc = SimpleDocTemplate(
        ruta_salida,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    # Estilos - usar fuente estándar que sí soporta Unicode en reportlab
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        spaceAfter=12,
        textColor='#2c3e50',
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontName='Helvetica',  # Helvetica sí soporta caracteres españoles en reportlab
        fontSize=11,
        leading=16,
        spaceAfter=12,
    )

    # Construir el contenido
    story = []
    story.append(Paragraph(titulo, title_style))
    story.append(Spacer(1, 0.3*cm))

    # Dividir el texto en párrafos
    parrafos = texto.split('\n')
    for parrafo in parrafos:
        parrafo = parrafo.strip()
        if parrafo:
            # Escapar caracteres especiales para XML/ReportLab
            parrafo = parrafo.replace('<', '&lt;').replace('>', '&gt;')
            # Convertir saltos de línea dobles a separación de párrafos
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

    print("=== REGENERANDO PDFs DE TEXTOS MODELO ===\n")

    for pdf_file, titulo in PDFS_TO_REGENERATE:
        ruta_completa = os.path.join(PDF_DIR, pdf_file)

        print(f"Procesando: {titulo}")
        print(f"  Archivo: {pdf_file}")

        # Hacer backup del archivo original
        backup_file = ruta_completa + ".backup"
        if not os.path.exists(backup_file):
            try:
                os.rename(ruta_completa, backup_file)
                print(f"  ✓ Backup creado: {os.path.basename(backup_file)}")
            except Exception as e:
                print(f"  ⚠ No se pudo crear backup: {e}")

        # Extraer texto del PDF original
        texto = extraer_texto_pdf(backup_file if os.path.exists(backup_file) else ruta_completa)

        if not texto:
            print(f"  ✗ No se pudo extraer texto. Omitiendo.\n")
            continue

        # Crear nuevo PDF con el texto
        if crear_pdf_con_texto(ruta_completa, texto, titulo):
            print(f"  ✓ PDF regenerado correctamente\n")
        else:
            print(f"  ✗ Error al regenerar PDF\n")

    print("=== PROCESO COMPLETADO ===")

if __name__ == "__main__":
    regenerar_pdfs()
