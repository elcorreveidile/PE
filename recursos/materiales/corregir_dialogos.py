#!/usr/bin/env python3
"""
Script para corregir errores gramaticales en textos modelo de diálogos.
Corrige: signos de apertura de interrogación (¿) y tildes en interrogativos.
"""

from pypdf import PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_LEFT
import os

PDF_DIR = os.path.dirname(os.path.abspath(__file__))

# Textos corregidos con gramática española correcta
TEXTOS_CORREGIDOS = {
    "texto-modelo-sesion-17-entrevista.pdf": {
        "titulo": "Texto modelo",
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
}

def crear_pdf_dialogo(ruta_salida, datos):
    """Crea un PDF con diálogo correctamente formateado."""

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

    # Interlocutor
    speaker_style = ParagraphStyle(
        'CustomSpeaker',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        spaceAfter=0.1*cm,
    )

    # Respuesta
    response_style = ParagraphStyle(
        'CustomResponse',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        spaceAfter=0.4*cm,
    )

    story = []

    # Título
    story.append(Paragraph(datos["titulo"], title_style))

    # Diálogos
    for interlocutor, texto in datos["dialogos"]:
        # Escapar caracteres especiales
        interlocutor = interlocutor.replace('<', '&lt;').replace('>', '&gt;')
        texto = texto.replace('<', '&lt;').replace('>', '&gt;')

        # Agregar interlocutor y respuesta
        speaker_text = f"<b>{interlocutor}:</b>"
        story.append(Paragraph(speaker_text, speaker_style))
        story.append(Paragraph(texto, response_style))

    # Construir PDF
    try:
        doc.build(story)
        return True
    except Exception as e:
        print(f"  ⚠ Error: {e}")
        return False

def corregir_dialogos():
    """Corrige los PDFs de diálogos con gramática correcta."""

    print("=== CORRIGIENDO ERRORES GRAMATICALES EN DIÁLOGOS ===\n")

    for pdf_file, datos in TEXTOS_CORREGIDOS.items():
        ruta_completa = os.path.join(PDF_DIR, pdf_file)

        print(f"Procesando: {pdf_file}")

        if crear_pdf_dialogo(ruta_completa, datos):
            print(f"  ✓ PDF corregido con gramática española correcta\n")
        else:
            print(f"  ✗ Error al corregir\n")

    print("=== PROCESO COMPLETADO ===")
    print("\nCORRECCIONES REALIZADAS:")
    print("Sesión 17:")
    print("  - 'Que' → '¿Qué?' ( interrogativos con tilde y ¿)")
    print("  - 'mas' → 'más' (tilde en adverbio de cantidad)")
    print("  - 'Tambien' → 'También' (tilde)")
    print("\nSesión 18:")
    print("  - 'Como' → '¿Cómo?' (interrogativo con tilde y ¿)")
    print("  - 'Que' → '¿Qué?' (interrogativos)")
    print("  - 'mas' → 'más' (tilde)")
    print("  - 'dificil' → 'difícil' (tilde)")
    print("  - 'aprenderias' → 'aprenderías' (tilde)")
    print("  - Corregidos tiempos verbales: 'establecí', 'revisé', 'comparé', 'pedí'")

if __name__ == "__main__":
    corregir_dialogos()
