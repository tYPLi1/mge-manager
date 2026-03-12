import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import * as XLSX from 'npm:xlsx@0.18.5';

// DKP_Log sheet structure:
// A = Player Name
// B = Prep Stage DKP (positive)
// C = War Stage DKP (positive)
// D = DKP Spend (negative)
// E = Source/Event (MEE, GEE, DDE, MGE, etc.)
// F = MGE rank or penalty reason (note)
// G = Date

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { file_url, dry_run } = await req.json();

    const fileResp = await fetch(file_url);
    const arrayBuffer = await fileResp.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

    // Find DKP_Log sheet
    const sheetName = workbook.SheetNames.find(s => 
      s.toLowerCase().replace(/[_\s]/g, '').includes('dkplog')
    );
    
    if (!sheetName) {
      return Response.json({
        error: 'DKP_Log sheet not found',
        available_sheets: workbook.SheetNames
      });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // Find header row or skip it
    let startRow = 0;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;
      const first = String(row[0]).toLowerCase().trim();
      if (first === 'name' || first === 'player' || first === 'spieler') {
        startRow = i + 1; // skip header
        break;
      }
    }

    const transactions = [];
    
    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;

      const name = row[0];
      if (!name || String(name).trim() === '') continue;

      const playerName = String(name).trim();
      const prepDkp = Number(row[1]) || 0;
      const warDkp = Number(row[2]) || 0;
      const spendDkp = Number(row[3]) || 0;
      const source = row[4] ? String(row[4]).trim() : '';
      const extraNote = row[5] ? String(row[5]).trim() : '';
      
      let eventDate = '';
      if (row[6]) {
        const rawDate = row[6];
        if (typeof rawDate === 'number') {
          // Excel serial date: days since 1900-01-01 (with off-by-one bug)
          const excelEpoch = new Date(1899, 11, 30);
          const d = new Date(excelEpoch.getTime() + rawDate * 86400000);
          eventDate = d.toISOString().split('T')[0];
        } else {
          eventDate = String(rawDate).trim();
        }
      }

      // Create transactions for each non-zero value
      if (prepDkp !== 0) {
        transactions.push({
          player_name: playerName,
          amount: Math.abs(prepDkp),
          type: 'earn',
          source: source,
          source_stage: 'prep',
          event_date: eventDate,
          note: extraNote || 'Import from DKP_Log (prep)'
        });
      }

      if (warDkp !== 0) {
        transactions.push({
          player_name: playerName,
          amount: Math.abs(warDkp),
          type: 'earn',
          source: source,
          source_stage: 'war',
          event_date: eventDate,
          note: extraNote || 'Import from DKP_Log (war)'
        });
      }

      if (spendDkp !== 0) {
        transactions.push({
          player_name: playerName,
          amount: -Math.abs(spendDkp),
          type: 'bid',
          source: source,
          source_stage: '',
          event_date: eventDate,
          note: extraNote || 'Import from DKP_Log (spend)'
        });
      }
    }

    if (dry_run) {
      // Return analysis without importing
      const sources = [...new Set(transactions.map(t => t.source))];
      return Response.json({
        sheet_name: sheetName,
        total_data_rows: rows.length - startRow,
        total_transactions: transactions.length,
        unique_sources: sources,
        sample_first_10: transactions.slice(0, 10),
        sample_last_5: transactions.slice(-5),
        headers_detected: rows[startRow - 1] || rows[0]
      });
    }

    // Match player_id from existing players
    const players = await base44.asServiceRole.entities.Player.filter({});
    const playerMap = {};
    for (const p of players) {
      playerMap[p.name] = p.id;
    }

    let matched = 0;
    let unmatched = 0;
    const unmatchedNames = new Set();

    for (const t of transactions) {
      const pid = playerMap[t.player_name];
      if (pid) {
        t.player_id = pid;
        matched++;
      } else {
        t.player_id = 'unknown';
        unmatched++;
        unmatchedNames.add(t.player_name);
      }
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
      matched_players: matched,
      unmatched_players: unmatched,
      unmatched_names: [...unmatchedNames]
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});