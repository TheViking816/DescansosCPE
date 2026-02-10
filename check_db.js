
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://xwouicfsrljxdeihpzll.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3b3VpY2ZzcmxqeGRlaWhwemxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2OTk3NDYsImV4cCI6MjA4NjI3NTc0Nn0.WdvTUVz5jaV29Gj6LRI_JTfdcOkTKEj0EKq6_3sZLfc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const log = [];
    const l = (msg) => { console.log(msg); log.push(msg); };

    try {
        l('Checking Users...');
        const { data: users, error: uErr } = await supabase.from('usuarios').select('*');
        if (uErr) l('Users error: ' + JSON.stringify(uErr));
        else l(`Found ${users?.length || 0} users.`);

        l('Checking Offers...');
        const { data: offers, error: oErr } = await supabase.from('ofertas').select('*');
        if (oErr) l('Offers error: ' + JSON.stringify(oErr));
        else {
            l(`Found ${offers?.length || 0} offers.`);
            if (offers?.length > 0) {
                offers.forEach(o => {
                    l(`- Offer ${o.id} by ${o.user_id} (Activa: ${o.activa})`);
                });
            }
        }

        // Test exact query used in app
        l('Testing App Query...');
        const { data: appOffers, error: appErr } = await supabase
            .from('ofertas')
            .select('*')
            .eq('activa', true);

        if (appErr) l('App Query error: ' + JSON.stringify(appErr));
        else l(`App Query found ${appOffers?.length || 0} active offers.`);

    } catch (e) {
        l('Script crash: ' + e.message);
    } finally {
        fs.writeFileSync('db_check.log', log.join('\n'));
    }
}

check();
