
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lgslrgpsxvwlgimggxga.supabase.co';
const supabaseAnonKey = 'sb_publishable_FIDgFUg4aMnC4ylhGON_Ow_lXyzTilg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
    console.log("--- Iniciando Carga de Prueba Visual ---");

    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'davidvarver@gmail.com',
            password: 'meirS123'
        });

        if (authError) throw authError;

        let { data: accounts } = await supabase.from('accounts').select('*');
        let testAccount = accounts.find(a => a.name === 'TEST_EFECTIVO') || accounts[0];
        let maaserAccount = accounts.find(a => a.name.toLowerCase() === 'maaser');

        if (!testAccount) {
            console.log("Creando cuenta inicial...");
            const { data: n } = await supabase.from('accounts').insert([{
                user_id: authData.user.id,
                name: 'TEST_EFECTIVO',
                type: 'wallet',
                initial_balance: 1000,
                current_balance: 1000,
                currency: 'MXN'
            }]).select().single();
            testAccount = n;
        }

        if (!maaserAccount) {
            const { data: m } = await supabase.from('accounts').insert([{
                user_id: authData.user.id,
                name: 'Maaser',
                type: 'savings',
                initial_balance: 0,
                current_balance: 0,
                currency: 'MXN'
            }]).select().single();
            maaserAccount = m;
        }

        const incomeAmount = 8000;
        const maaserAmount = 800;
        const mainTxId = require('crypto').randomUUID();

        console.log(`Insertando 'Proyecto Antigravity' ($8000) en ${testAccount.name}...`);

        // 1. Principal
        await supabase.from('transactions').insert([{
            id: mainTxId,
            user_id: authData.user.id,
            description: "Proyecto Antigravity (Test Visual)",
            amount: incomeAmount,
            type: 'income',
            account_id: testAccount.id,
            date: new Date().toISOString(),
            is_maaserable: true,
            status: 'cleared'
        }]);

        // 2. Maaser
        await supabase.from('transactions').insert([{
            id: require('crypto').randomUUID(),
            user_id: authData.user.id,
            description: `Maaser (10%): Proyecto Antigravity`,
            amount: maaserAmount,
            type: 'transfer',
            account_id: testAccount.id,
            to_account_id: maaserAccount.id,
            date: new Date().toISOString(),
            is_system_generated: true,
            related_transaction_id: mainTxId,
            status: 'cleared'
        }]);

        // 3. RPC Balances
        await supabase.rpc('increment_account_balance', { account_id: testAccount.id, delta: incomeAmount });
        await supabase.rpc('increment_account_balance', { account_id: testAccount.id, delta: -maaserAmount });
        await supabase.rpc('increment_account_balance', { account_id: maaserAccount.id, delta: maaserAmount });

        console.log("¡Listo! Las transacciones están en tu cuenta. NO han sido borradas.");
        console.log("Ahora puedes abrir tu app en el navegador y verlas.");

    } catch (e) {
        console.error("Error:", e.message);
    }
}

runTest();
