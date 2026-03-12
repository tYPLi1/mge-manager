import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { file_url, dry_run } = await req.json();
    
    // Fetch the Excel file
    const fileResp = await fetch(file_url);
    const arrayBuffer = await fileResp.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    // Get the DKP_Log sheet
    const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('dkp_log') || s.toLowerCase().includes('dkplog'));
    if (!sheetName) {
      return Response.json({ 
        error: 'DKP_Log sheet not found', 
        available_sheets: workbook.SheetNames 
      });
    }
    
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    // Find the header row - look for a row that has "Name" or "Player" in it
    let headerRowIdx = -1;
    let headers = [];
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      const row = rawData[i];
      if (!row) continue;
      const rowStr = row.map(c => String(c || '').toLowerCase());
      if (rowStr.includes('name') || rowStr.includes('player')) {
        headerRowIdx = i;
        headers = row;
        break;
      }
    }
    
    if (headerRowIdx === -1) {
      // Just return first 5 rows for debugging
      return Response.json({
        error: 'Could not find header row',
        first_rows: rawData.slice(0, 10),
        sheet_name: sheetName
      });
    }

    // Identify columns
    // Based on user description: Col A = Player name, then Date column, then event columns (MEE, GEE, DDE, MGE, etc.)
    const colMap = {};
    for (let c = 0; c < headers.length; c++) {
      const h = String(headers[c] || '').trim();
      if (!h) continue;
      const hLower = h.toLowerCase();
      if (hLower === 'name' || hLower === 'player' || hLower === 'spieler') {
        colMap.nameCol = c;
      } else if (hLower === 'date' || hLower === 'datum' || hLower === 'event_date' || hLower === 'event date') {
        colMap.dateCol = c;
      } else {
        // Assume it's an event column
        if (!colMap.eventCols) colMap.eventCols = [];
        colMap.eventCols.push({ idx: c, name: h });
      }
    }

    if (colMap.nameCol === undefined) {
      return Response.json({
        error: 'Could not find Name/Player column',
        headers: headers,
        colMap
      });
    }

    // Process data rows
    const transactions = [];
    let skippedRows = 0;
    
    for (let r = headerRowIdx + 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row) continue;
      
      const playerName = row[colMap.nameCol];
      if (!playerName || String(playerName).trim() === '') continue;
      
      // Get date
      let eventDate = '';
      if (colMap.dateCol !== undefined && row[colMap.dateCol]) {
        const rawDate = row[colMap.dateCol];
        if (typeof rawDate === 'number') {
          // Excel serial date
          const d = XLSX.SSF.parse_date_code(rawDate);
          if (d) {
            eventDate = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
          }
        } else {
          eventDate = String(rawDate);
        }
      }
      
      // Process each event column
      if (colMap.eventCols) {
        for (const ec of colMap.eventCols) {
          const val = row[ec.idx];
          if (val === null || val === undefined || val === '' || val === 0) continue;
          const amount = Number(val);
          if (isNaN(amount) || amount === 0) continue;
          
          transactions.push({
            player_id: '',
            player_name: String(playerName).trim(),
            amount: amount,
            type: amount > 0 ? 'earn' : 'penalty',
            source: ec.name,
            source_stage: '',
            event_date: eventDate,
            note: `Imported from Excel DKP_Log`
          });
        }
      } else {
        skippedRows++;
      }
    }

    if (dry_run) {
      return Response.json({
        sheet_name: sheetName,
        headers: headers,
        colMap,
        total_transactions: transactions.length,
        sample: transactions.slice(0, 20),
        skipped_rows: skippedRows
      });
    }

    // Bulk create in batches of 100
    let created = 0;
    for (let i = 0; i < transactions.length; i += 100) {
      const batch = transactions.slice(i, i + 100);
      await base44.asServiceRole.entities.DKPTransaction.bulkCreate(batch);
      created += batch.length;
    }

    return Response.json({
      success: true,
      total_created: created,
      sheet_name: sheetName
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});