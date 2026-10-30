import { jsPDF } from 'jspdf'

type Room = {
  x: number
  y: number
  width: number
  height: number
  name: string
  description?: string
  outdoor?: boolean
}

export function downloadFloorPlan() {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  pdf.setFillColor(247, 249, 246)
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')
  pdf.setFillColor(15, 35, 40)
  pdf.rect(0, 0, pageWidth, 115, 'F')
  pdf.setTextColor(125, 231, 216)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('APEX HEIGHTS  /  PLOT 14', 42, 34)
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(25)
  pdf.text('The Horizon Villa', 42, 68)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(186, 204, 199)
  pdf.text('CONCEPTUAL FLOOR PLAN', 43, 91)
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.text('4 BEDROOMS   /   3,200 SQ FT   /   2 LEVELS', pageWidth - 42, 63, { align: 'right' })

  const drawPlan = (originX: number, title: string, number: string, rooms: Room[]) => {
    const originY = 187
    pdf.setTextColor(36, 58, 59)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(15)
    pdf.text(title, originX, 153)
    pdf.setFontSize(9)
    pdf.setTextColor(99, 126, 122)
    pdf.text(number, originX + 340, 153, { align: 'right' })
    pdf.setDrawColor(198, 213, 207)
    pdf.setLineWidth(0.7)
    pdf.line(originX, 165, originX + 340, 165)

    for (const room of rooms) {
      if (room.outdoor) pdf.setFillColor(229, 241, 233)
      else pdf.setFillColor(255, 255, 255)
      pdf.setDrawColor(71, 98, 95)
      pdf.setLineWidth(1.1)
      pdf.rect(originX + room.x, originY + room.y, room.width, room.height, 'FD')
      pdf.setTextColor(48, 74, 72)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(room.width < 70 ? 7 : 8)
      pdf.text(room.name, originX + room.x + room.width / 2, originY + room.y + room.height / 2 - (room.description ? 3 : 0), { align: 'center' })
      if (room.description) {
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(130, 151, 146)
        pdf.setFontSize(7)
        pdf.text(room.description, originX + room.x + room.width / 2, originY + room.y + room.height / 2 + 10, { align: 'center' })
      }
    }
  }

  drawPlan(42, 'Ground floor', '01 / 02', [
    { x: 0, y: 0, width: 94, height: 78, name: 'GARAGE', description: '2 CARS' },
    { x: 94, y: 0, width: 63, height: 78, name: 'ENTRY' },
    { x: 157, y: 0, width: 92, height: 78, name: 'KITCHEN' },
    { x: 249, y: 0, width: 91, height: 78, name: 'DINING' },
    { x: 0, y: 78, width: 94, height: 100, name: 'GUEST BED', description: 'BEDROOM 01' },
    { x: 94, y: 78, width: 63, height: 50, name: 'BATH' },
    { x: 94, y: 128, width: 63, height: 50, name: 'UTILITY' },
    { x: 157, y: 78, width: 183, height: 100, name: 'LIVING', description: 'OPEN PLAN' },
    { x: 0, y: 178, width: 340, height: 48, name: 'COVERED TERRACE', outdoor: true },
  ])

  drawPlan(pageWidth - 382, 'Upper floor', '02 / 02', [
    { x: 0, y: 0, width: 104, height: 86, name: 'BEDROOM 02' },
    { x: 104, y: 0, width: 65, height: 86, name: 'BATH' },
    { x: 169, y: 0, width: 75, height: 86, name: 'BEDROOM 03' },
    { x: 244, y: 0, width: 96, height: 86, name: 'STUDY' },
    { x: 0, y: 86, width: 104, height: 92, name: 'FAMILY', description: 'LOUNGE' },
    { x: 104, y: 86, width: 65, height: 92, name: 'LANDING' },
    { x: 169, y: 86, width: 105, height: 92, name: 'PRIMARY BED', description: 'BEDROOM 04' },
    { x: 274, y: 86, width: 66, height: 92, name: 'ENSUITE' },
    { x: 0, y: 178, width: 340, height: 48, name: 'BALCONY', outdoor: true },
  ])

  pdf.setDrawColor(205, 217, 211)
  pdf.line(42, 462, pageWidth - 42, 462)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(54, 80, 75)
  pdf.text('A DIFFERENT PERSPECTIVE ON HOME.', 42, 487)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(111, 130, 124)
  pdf.text('Illustrative concept only. Layout, dimensions, and specifications are subject to final design and approval. Not to scale.', 42, 505)
  pdf.text('APEX HEIGHTS  /  PLOT 14', pageWidth - 42, pageHeight - 35, { align: 'right' })
  pdf.save('apex-heights-plot-14-floor-plan.pdf')
}