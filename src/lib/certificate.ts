import { normalizeName } from './utils'

export type CertificateOptions = {
  churchName: string
  platformName: string
  footerText: string
  studentName: string
  courseName: string
  instructorName?: string | null
  attendanceCount: number
  totalSessions: number
  percentage: number
  watermarkDataUrl?: string | null
  signatureDataUrl?: string | null
  issuedAt?: Date
}

export async function createCertificatePdf(options: CertificateOptions) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const center = width / 2
  const gold: [number, number, number] = [199, 166, 73]
  const paleGold: [number, number, number] = [238, 221, 163]
  const ivory: [number, number, number] = [250, 247, 237]
  const muted: [number, number, number] = [177, 169, 143]

  doc.setFillColor(7, 8, 7)
  doc.rect(0, 0, width, height, 'F')
  doc.setFillColor(12, 13, 11)
  doc.roundedRect(18, 18, width - 36, height - 36, 3, 3, 'F')

  drawCertificateFrame(doc, width, height, gold)

  if (options.watermarkDataUrl) {
    try {
      doc.saveGraphicsState()
      doc.setGState(doc.GState({ opacity: 0.055 }))
      addContainedImage(doc, options.watermarkDataUrl, center - 142, 126, 284, 284)
      doc.restoreGraphicsState()
    } catch {
      doc.restoreGraphicsState()
    }
  }

  doc.setTextColor(...gold)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(options.churchName.toUpperCase(), center, 65, { align: 'center', charSpace: 1.8 })

  doc.setDrawColor(...gold)
  doc.setFillColor(...gold)
  doc.line(center - 88, 78, center - 10, 78)
  doc.line(center + 10, 78, center + 88, 78)
  drawDiamond(doc, center, 78, 4)

  doc.setFont('times', 'bold')
  doc.setTextColor(...ivory)
  doc.setFontSize(35)
  doc.text('Certificado de Conclusao', center, 120, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...muted)
  doc.text('Certificamos, para os devidos fins, que', center, 151, { align: 'center' })

  doc.setFont('times', 'bold')
  doc.setFontSize(fitFontSize(doc, options.studentName, width - 170, 31, 22))
  doc.setTextColor(...paleGold)
  doc.text(options.studentName, center, 193, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...muted)
  doc.text('concluiu com aproveitamento o curso', center, 222, { align: 'center' })

  doc.setFont('times', 'bold')
  doc.setFontSize(fitFontSize(doc, options.courseName, width - 210, 23, 17))
  doc.setTextColor(...ivory)
  const courseLines = doc.splitTextToSize(options.courseName, width - 210).slice(0, 2)
  doc.text(courseLines, center, 258, { align: 'center', lineHeightFactor: 1.08 })

  const badgeY = courseLines.length > 1 ? 310 : 292
  const attendanceText = `${options.percentage}% de frequencia  |  ${Math.min(options.attendanceCount, options.totalSessions)} de ${options.totalSessions} encontros`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  const badgeWidth = Math.min(330, doc.getTextWidth(attendanceText) + 34)
  doc.setFillColor(28, 27, 21)
  doc.setDrawColor(83, 72, 38)
  doc.roundedRect(center - badgeWidth / 2, badgeY, badgeWidth, 30, 15, 15, 'FD')
  doc.setTextColor(...paleGold)
  doc.text(attendanceText, center, badgeY + 19, { align: 'center' })

  const signatureLineY = 459
  const leftCenter = center - 142
  const rightCenter = center + 142

  if (options.signatureDataUrl) {
    try {
      addContainedImage(doc, options.signatureDataUrl, leftCenter - 82, 372, 164, 68)
    } catch {
      // The certificate remains valid if a remote signature cannot be loaded.
    }
  }

  doc.setDrawColor(111, 96, 48)
  doc.setLineWidth(0.7)
  doc.line(leftCenter - 92, signatureLineY, leftCenter + 92, signatureLineY)
  doc.line(rightCenter - 92, signatureLineY, rightCenter + 92, signatureLineY)

  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...ivory)
  doc.text(options.instructorName || 'Professor responsavel', leftCenter, 479, { align: 'center', maxWidth: 180 })
  doc.text(options.platformName, rightCenter, 479, { align: 'center', maxWidth: 180 })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...muted)
  doc.text('PROFESSOR / RESPONSAVEL', leftCenter, 497, { align: 'center', charSpace: 0.8 })
  doc.text(options.churchName.toUpperCase(), rightCenter, 497, { align: 'center', charSpace: 0.8 })

  const issuedAt = options.issuedAt ?? new Date()
  doc.setFontSize(7.5)
  doc.setTextColor(126, 119, 96)
  doc.text(
    `${options.footerText}  |  Emitido em ${issuedAt.toLocaleDateString('pt-BR')}`,
    center,
    height - 34,
    { align: 'center', maxWidth: width - 130 },
  )

  return doc
}

export function certificateFileName(studentName: string) {
  return `certificado-${normalizeName(studentName).replace(/\s+/g, '-')}.pdf`
}

export async function imageUrlToDataUrl(url: string | null | undefined) {
  if (!url) return null
  const response = await fetch(url)
  if (!response.ok) throw new Error('Nao foi possivel carregar a imagem do certificado.')
  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function fitFontSize(doc: InstanceType<typeof import('jspdf').jsPDF>, text: string, maxWidth: number, preferred: number, minimum: number) {
  let size = preferred
  doc.setFontSize(size)
  while (size > minimum && doc.getTextWidth(text) > maxWidth) {
    size -= 1
    doc.setFontSize(size)
  }
  return size
}

function drawCertificateFrame(
  doc: InstanceType<typeof import('jspdf').jsPDF>,
  width: number,
  height: number,
  gold: [number, number, number],
) {
  doc.setDrawColor(...gold)
  doc.setLineWidth(1.4)
  doc.rect(24, 24, width - 48, height - 48)
  doc.setDrawColor(83, 72, 38)
  doc.setLineWidth(0.55)
  doc.rect(31, 31, width - 62, height - 62)
  doc.rect(39, 39, width - 78, height - 78)

  const length = 48
  const inset = 46
  doc.setDrawColor(...gold)
  doc.setLineWidth(1.6)
  for (const [x, y, sx, sy] of [
    [inset, inset, 1, 1],
    [width - inset, inset, -1, 1],
    [inset, height - inset, 1, -1],
    [width - inset, height - inset, -1, -1],
  ] as const) {
    doc.line(x, y, x + sx * length, y)
    doc.line(x, y, x, y + sy * length)
    drawDiamond(doc, x + sx * 9, y + sy * 9, 2.6)
  }
}

function drawDiamond(doc: InstanceType<typeof import('jspdf').jsPDF>, x: number, y: number, radius: number) {
  doc.triangle(x, y - radius, x + radius, y, x, y + radius, 'F')
  doc.triangle(x, y - radius, x - radius, y, x, y + radius, 'F')
}

function addContainedImage(
  doc: InstanceType<typeof import('jspdf').jsPDF>,
  dataUrl: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
) {
  const properties = doc.getImageProperties(dataUrl)
  const ratio = Math.min(maxWidth / properties.width, maxHeight / properties.height)
  const width = properties.width * ratio
  const height = properties.height * ratio
  doc.addImage(dataUrl, imageFormat(dataUrl), x + (maxWidth - width) / 2, y + (maxHeight - height) / 2, width, height, undefined, 'FAST')
}

function imageFormat(dataUrl: string) {
  if (dataUrl.startsWith('data:image/jpeg')) return 'JPEG'
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP'
  return 'PNG'
}
