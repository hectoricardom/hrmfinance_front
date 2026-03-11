/**
 * Delivery Manifest PDF Generator
 *
 * Generates professional PDF documents for delivery manifests
 */

import jsPDF from 'jspdf';
import { DeliveryManifest, ManifestPrintOptions } from '../types/manifestTypes';
import { devLog } from '../../../services/utils';

/**
 * Generate PDF from manifest
 */
export async function generateManifestPDF(
  manifest: DeliveryManifest,
  options: ManifestPrintOptions = {}
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  let currentY = margin;
  let currentPage = 1;

  // Helper to add new page
  const checkAddPage = (spaceNeeded: number = 20) => {
    if (currentY + spaceNeeded > pageHeight - margin) {
      doc.addPage();
      currentPage++;
      currentY = margin;
      return true;
    }
    return false;
  };

  // Helper to add page number footer
  const addPageFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${currentPage} | Generado: ${new Date().toLocaleString('es-ES')}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  };

  // ====== HEADER ======
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 110, 253);
  doc.text('MANIFIESTO DE ENTREGA', margin, currentY);
  currentY += 8;

  // Manifest Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  doc.text(`ID Manifiesto: ${manifest.manifestId}`, margin, currentY);
  currentY += 5;

  if (manifest.guideNumber) {
    doc.text(`Número de Guía: ${manifest.guideNumber}`, margin, currentY);
    currentY += 5;
  }

  doc.text(
    `Generado: ${new Date(manifest.generatedAt).toLocaleString('es-ES')}`,
    margin,
    currentY
  );
  currentY += 8;

  // Summary Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 249, 250);
  doc.rect(margin, currentY, contentWidth, 20, 'FD');

  currentY += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  const summaryX = margin + 5;
  const col1 = summaryX;
  const col2 = summaryX + 50;
  const col3 = summaryX + 100;

  doc.text(`Estados: ${manifest.totalStates}`, col1, currentY);
  doc.text(`Direcciones: ${manifest.totalAddresses}`, col2, currentY);
  doc.text(`Clientes: ${manifest.totalCustomers}`, col3, currentY);
  currentY += 5;

  doc.text(`Bolsas: ${manifest.totalBags}`, col1, currentY);
  doc.text(`Artículos: ${manifest.totalItems}`, col2, currentY);
  doc.text(`Peso: ${manifest.totalWeight.toFixed(2)} kgs`, col3, currentY);
  currentY += 12;

  // ====== MANIFEST BODY ======
  manifest.states.forEach((state, stateIndex) => {
    // State Header
    if (options.pageBreakByState && stateIndex > 0) {
      doc.addPage();
      currentPage++;
      currentY = margin;
    } else {
      checkAddPage(30);
    }

    // State title
    doc.setFillColor(13, 110, 253);
    doc.rect(margin, currentY, contentWidth, 8, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${state.state} - ${state.totalCities} Ciudades, ${state.totalAddresses} Direcciones`,
      margin + 2,
      currentY + 5.5
    );
    currentY += 10;

    // Cities
    state.cities.forEach((city) => {
      checkAddPage(15);

      // City Header
      doc.setFillColor(231, 241, 255);
      doc.rect(margin, currentY, contentWidth, 6, 'F');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 110, 253);
      doc.text(
        `${city.city} - ${city.totalRptos} Rptos, ${city.totalAddresses} Direcciones`,
        margin + 2,
        currentY + 4
      );
      currentY += 8;

      // Rptos
      city.rptos.forEach((rpto) => {
        checkAddPage(12);

        // Rpto Header
        doc.setFillColor(248, 249, 250);
        doc.rect(margin + 3, currentY, contentWidth - 6, 5, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(73, 80, 87);
        doc.text(
          `${rpto.rpto} - ${rpto.totalAddresses} Direcciones, ${rpto.totalCustomers} Clientes`,
          margin + 5,
          currentY + 3.5
        );
        currentY += 7;

        // Addresses
        rpto.addresses.forEach((address, addrIndex) => {
      checkAddPage(40);

      // Address box
      doc.setDrawColor(222, 226, 230);
      doc.setLineWidth(0.5);
      doc.rect(margin, currentY, contentWidth, 8);

      doc.setFillColor(231, 241, 255);
      doc.rect(margin, currentY, contentWidth, 8, 'F');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(
        `${address.fullAddress}`,
        margin + 2,
        currentY + 5.5
      );

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(108, 117, 125);
      doc.text(
        `(${address.totalCustomers} clientes, ${address.totalBags} bolsas)`,
        margin + 2,
        currentY + 9.5
      );
      currentY += 11;

      // Customers at this address
      address.customers.forEach((customer, custIndex) => {
        checkAddPage(35);

        // Customer info box
        doc.setFillColor(248, 249, 250);
        doc.rect(margin + 5, currentY, contentWidth - 10, 12, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);

        const custX = margin + 7;
        doc.text(`CID: ${customer.cid}`, custX, currentY + 4);
        doc.text(`Nombre: ${customer.consigneeName}`, custX, currentY + 8);
        doc.text(`Teléfono: ${customer.ctelephone}`, custX + 80, currentY + 4);
        doc.text(
          `${customer.totalBags} bolsas | ${customer.totalItems} artículos | ${customer.totalWeight.toFixed(2)} kgs`,
          custX + 80,
          currentY + 8
        );
        currentY += 14;

        // Bags
        customer.bags.forEach((bag) => {
          checkAddPage(20);

          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);

          const bagX = margin + 10;
          doc.text(
            `Bolsa #${bag.bagNumber}  -  ${bag.totalHBLs} HBLs  |  ${bag.itemCount} artículos  |  ${bag.totalWeight.toFixed(2)} kgs`,
            bagX,
            currentY
          );
          currentY += 4;

          // Show HBL groups
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(13, 110, 253);

          bag.hblGroups.forEach((hblGroup) => {
            checkAddPage(8);
            doc.text(
              `${hblGroup.hbl} (${hblGroup.itemCount} artículos, ${hblGroup.totalWeight.toFixed(2)} kgs)`,
              bagX + 3,
              currentY
            );
            currentY += 3.5;

            // Show individual items if details option enabled
            if (options.includeDetails) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(6);
              doc.setTextColor(73, 80, 87);

              hblGroup.items.forEach((item) => {
                checkAddPage(5);
                doc.text(
                  `    • ${item.namegood.substring(0, 35)} (${item.quantity} pzs, ${item.weight} kgs)`,
                  bagX + 6,
                  currentY
                );
                currentY += 3;
              });
              currentY += 1;

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(7);
              doc.setTextColor(13, 110, 253);
            }
          });

          currentY += 2;
        });

        // Signature line
        if (options.includeSignature !== false) {
          checkAddPage(15);

          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.3);
          doc.line(pageWidth - margin - 60, currentY + 8, pageWidth - margin - 10, currentY + 8);

          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text('Firma', pageWidth - margin - 35, currentY + 12, { align: 'center' });

          currentY += 15;
        }

        // Separator between customers
        if (custIndex < address.customers.length - 1) {
          doc.setDrawColor(222, 226, 230);
          doc.setLineWidth(0.2);
          doc.line(margin + 5, currentY, pageWidth - margin - 5, currentY);
          currentY += 3;
        }
      });

          currentY += 5;
        });
      });
    });

    currentY += 3;
  });

  // Add page footers
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter();
  }

  return doc;
}

/**
 * Generate and download manifest PDF
 */
export async function downloadManifestPDF(
  manifest: DeliveryManifest,
  options: ManifestPrintOptions = {}
): Promise<void> {
  const doc = await generateManifestPDF(manifest, options);
  const filename = `Manifiesto-${manifest.manifestId}.pdf`;
  doc.save(filename);
}

/**
 * Generate compact manifest PDF with bags and HBLs
 */
export async function generateCompactManifestPDF(
  manifest: DeliveryManifest
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  devLog({manifest})

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let currentY = margin;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MANIFIESTO DE ENTREGA', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`ID: ${manifest.manifestId}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  if (manifest.guideNumber) {
    doc.text(`Guía: ${manifest.guideNumber}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
  }

  currentY += 5;

  // Process each state
  manifest.states.forEach((state) => {
    // State header
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = margin;
    }

    doc.setFillColor(13, 110, 253);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${state.state}`, margin + 2, currentY + 4.5);
    currentY += 9;

    state.cities.forEach((city) => {
      city.rptos.forEach((rpto) => {
        rpto.addresses.forEach((address) => {
          // Group customers by CID within this street
          const customersByCID = new Map<string, typeof address.customers>();

          address.customers.forEach((customer) => {
            const cid = customer.cid;
            if (!customersByCID.has(cid)) {
              customersByCID.set(cid, []);
            }
            customersByCID.get(cid)!.push(customer);
          });

          // Calculate space needed for the entire street section
          const streetHeaderSpace = 7;
          let totalStreetSpace = streetHeaderSpace;

          // Calculate space for all CID groups in this street
          customersByCID.forEach((customersInGroup, cid) => {
            const totalBags = customersInGroup.reduce((sum, c) => sum + c.bags.length, 0);
            const cidRecordSpace = 11 + (totalBags * 3.5) + 9; // header + bags + signature
            totalStreetSpace += cidRecordSpace;
          });

          // Check if we need a new page for this street and all its customers
          // Only start on new page if the FIRST customer won't fit
          const firstCustomerBags = Array.from(customersByCID.values())[0]?.reduce((sum, c) => sum + c.bags.length, 0) || 0;
          const firstCustomerSpace = streetHeaderSpace + 11 + (firstCustomerBags * 3.5) + 9;

          if (currentY + firstCustomerSpace > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
          }

          // Street header (address) - Show ONCE per street
          doc.setFillColor(231, 241, 255);
          doc.rect(margin, currentY, pageWidth - (margin * 2), 6, 'F');

          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(13, 110, 253);
          doc.text(
            address?.fullAddress?.substring(0, 90) || 'Sin dirección',
            margin + 2,
            currentY + 4
          );
          currentY += 7;

          // Process each CID group under this street
          customersByCID.forEach((customersInGroup, cid) => {
            // Calculate total space needed for this complete CID record
            const totalBags = customersInGroup.reduce((sum, c) => sum + c.bags.length, 0);
            const cidHeaderSpace = 11;  // CID info header
            const bagsSpace = totalBags * 3.5;  // Each bag line
            const signatureSpace = 9;  // Signature line + spacing
            const neededSpace = cidHeaderSpace + bagsSpace + signatureSpace;

            // Check if we need a new page for this COMPLETE CID group (no cutting records)
            if (currentY + neededSpace > pageHeight - margin) {
              doc.addPage();
              currentY = margin;
            }

            // CID group info
            doc.setFillColor(248, 249, 250);
            doc.rect(margin, currentY, pageWidth - (margin * 2), 10, 'F');

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);

            // Show CID and first customer name as representative
            const firstCustomer = customersInGroup[0];
            doc.text(
              `CID: ${cid} - ${firstCustomer?.consigneeName?.substring(0, 35)}`,
              margin + 2,
              currentY + 4
            );

            // Calculate totals for this CID group
            const totalBagsInGroup = customersInGroup.reduce((sum, c) => sum + c.totalBags, 0);
            const totalItemsInGroup = customersInGroup.reduce((sum, c) => sum + c.totalItems, 0);
            const totalWeightInGroup = customersInGroup.reduce((sum, c) => sum + c.totalWeight, 0);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(108, 117, 125);
            doc.text(
              `${totalBagsInGroup} bolsas | ${totalItemsInGroup} artículos | ${totalWeightInGroup.toFixed(1)} kgs`,
              pageWidth - margin - 5,
              currentY + 4,
              { align: 'right' }
            );

            // Show phone if available
            if (firstCustomer?.ctelephone) {
              doc.setFontSize(7);
              doc.text(
                `Tel: ${firstCustomer.ctelephone}`,
                margin + 2,
                currentY + 8
              );
            }

            currentY += 11;

            // Process all bags for all customers with this CID
            // No page break checks here - we already ensured space for the complete record
            customersInGroup.forEach((customer) => {
              customer.bags.forEach((bag) => {
                // Bag info
                const bagX = margin + 3;
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(
                  `Bolsa #${bag?.bagNumber}`,
                  bagX,
                  currentY
                );

                // HBLs in this bag
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(13, 110, 253);
                const hblList = bag.hblGroups.map(g => g.hbl).join(', ');
                doc.text(
                  `HBLs: ${hblList.substring(0, 85)}`,
                  bagX + 35,
                  currentY
                );

                doc.setTextColor(0, 0, 0);
                currentY += 3.5;
              });
            });

            currentY += 2;

            // Signature line for this CID group
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.2);
            doc.line(pageWidth - margin - 50, currentY, pageWidth - margin - 5, currentY);
            doc.setFontSize(6);
            doc.setTextColor(0, 0, 0);
            doc.text('Firma', pageWidth - margin - 27.5, currentY + 3, { align: 'center' });

            currentY += 7;
          });
        });
      });
    });

    currentY += 2;
  });

  return doc;
}
