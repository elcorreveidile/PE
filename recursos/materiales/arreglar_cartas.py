#!/usr/bin/env python3
"""
Script específico para corregir el formato de cartas formales (sesiones 5, 6, 21).
Separa correctamente: fecha, asunto, saludo, párrafos y cierre.
"""

from pypdf import PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_JUSTIFY
import os
import re

PDF_DIR = os.path.dirname(os.path.abspath(__file__))

# Configuración de cartas formales
CARTAS_FORMALES = {
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
    "texto-modelo-sesion-21-peticion-persuasiva.pdf": {
        "destinatario": "Estimado profesor:",
        "cuerpo": [
            "Le escribo para solicitar una pequena ampliacion del plazo de entrega del proyecto final. Durante esta semana he tenido que atender un compromiso laboral imprevisto que ha reducido el tiempo disponible.",
            "Agradeceria poder entregar el trabajo el lunes por la manana. Con esa extension podre revisar la cohesion del texto y asegurar la calidad del resultado. Me comprometo a enviarle un avance el viernes.",
            "Gracias por su comprension y por la flexibilidad. Quedo atento a su respuesta."
        ],
        "cierre": "[Nombre y apellidos]"
    },
}

def crear_pdf_carta(ruta_salida, datos):
    """Crea un PDF con el formato correcto de carta formal."""

    doc = SimpleDocTemplate(
        ruta_salida,
        pagesize=A4,
        rightMargin=2.5*cm,
        leftMargin=2.5*cm,
        topMargin=3*cm,
        bottomMargin=3*cm,
    )

    styles = getSampleStyleSheet()

    # Título
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12,
        spaceAfter=1*cm,
        textColor='#2c3e50',
    )

    # Fecha (alineada a la derecha)
    fecha_style = ParagraphStyle(
        'CustomFecha',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        spaceAfter=0.3*cm,
        alignment=TA_RIGHT,
    )

    # Asunto (negrita)
    asunto_style = ParagraphStyle(
        'CustomAsunto',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        spaceAfter=0.8*cm,
    )

    # Destinatario
    destinatario_style = ParagraphStyle(
        'CustomDestinatario',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        spaceAfter=0.5*cm,
    )

    # Cuerpo
    cuerpo_style = ParagraphStyle(
        'CustomCuerpo',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=11,
        leading=17,
        spaceAfter=0.5*cm,
        alignment=TA_JUSTIFY,
    )

    # Cierre
    cierre_style = ParagraphStyle(
        'CustomCierre',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        spaceAfter=0.3*cm,
    )

    story = []

    # Título
    story.append(Paragraph("Texto modelo", title_style))

    # Fecha (si existe)
    if "fecha" in datos:
        story.append(Paragraph(datos["fecha"], fecha_style))

    # Asunto (si existe)
    if "asunto" in datos:
        asunto_text = f"Asunto: {datos['asunto']}"
        story.append(Paragraph(asunto_text, asunto_style))

    # Destinatario
    if "destinatario" in datos:
        story.append(Paragraph(datos["destinatario"], destinatario_style))

    # Párrafos del cuerpo
    for parrafo in datos["cuerpo"]:
        parrafo = parrafo.replace('<', '&lt;').replace('>', '&gt;')
        story.append(Paragraph(parrafo, cuerpo_style))

    # Cierre
    if "cierre" in datos:
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(datos["cierre"], cierre_style))

    # Nombre (si existe)
    if "nombre" in datos:
        story.append(Paragraph(datos["nombre"], cierre_style))

    # Construir PDF
    try:
        doc.build(story)
        return True
    except Exception as e:
        print(f"  ⚠ Error: {e}")
        return False

def arreglar_cartas():
    """Regenera los PDFs de cartas formales con formato correcto."""

    print("=== ARREGLANDO CARTAS FORMALES CON FORMATO CORRECTO ===\n")

    for pdf_file, datos in CARTAS_FORMALES.items():
        ruta_completa = os.path.join(PDF_DIR, pdf_file)

        print(f"Procesando: {pdf_file}")

        if crear_pdf_carta(ruta_completa, datos):
            print(f"  ✓ PDF regenerado con formato correcto\n")
        else:
            print(f"  ✗ Error al regenerar\n")

    print("=== PROCESO COMPLETADO ===")

if __name__ == "__main__":
    arreglar_cartas()
