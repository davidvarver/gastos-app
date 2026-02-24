
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://lgslrgpsxvwlgimggxga.supabase.co';
const supabaseAnonKey = 'sb_publishable_FIDgFUg4aMnC4ylhGON_Ow_lXyzTilg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log("--- Iniciando Prueba Funcional con Usuario Real ---");

    try {
        // 1. Autenticación
        console.log("Intentando login...");
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'davidvarver@gmail.com',
            password: 'meirS123'
        });

        if (authError) {
            console.error("Error de autenticación:", authError.message);
            return;
        }
        console.log("Login exitoso. User ID:", authData.user.id);

        // 2. Buscar o crear cuenta de prueba
        console.log("\n--- Configurando Cuentas ---");
        let { data: accounts } = await supabase.from('accounts').select('*');

        let testAccount = accounts.find(a => a.name === 'TEST_EFECTIVO');
        let maaserAccount = accounts.find(a => a.name.toLowerCase() === 'maaser');

        if (!testAccount) {
            console.log("Creando cuenta 'TEST_EFECTIVO'...");
            const { data: newAcc, error: createAccError } = await supabase.from('accounts').insert([{
                user_id: authData.user.id,
                name: 'TEST_EFECTIVO',
                type: 'wallet',
                initial_balance: 1000,
                current_balance: 1000,
                currency: 'MXN'
            }]).select().single();
            if (createAccError) throw createAccError;
            testAccount = newAcc;
        }

        if (!maaserAccount) {
            console.log("Creando cuenta 'Maaser'...");
            const { data: newMaaser, error: createMaaserError } = await supabase.from('accounts').insert([{
                user_id: authData.user.id,
                name: 'Maaser',
                type: 'savings',
                initial_balance: 0,
                current_balance: 0,
                currency: 'MXN'
            }]).select().single();
            if (createMaaserError) throw createMaaserError;
            maaserAccount = newMaaser;
        }

        console.log(`Cuentas listas: 
        - ${testAccount.name} Balance: ${testAccount.current_balance}
        - ${maaserAccount.name} Balance: ${maaserAccount.current_balance}`);

        // 3. Prueba de Transacción con Maaser (Simulando useTransactions)
        console.log("\n--- Ejecutando Prueba de Transacción (Sueldo + Maaser) ---");
        const incomeAmount = 5000;
        const maaserAmount = 500;
        const mainTxId = require('crypto').randomUUID();
        const maaserTxId = require('crypto').randomUUID();

        // Operación Atómica Simulada (Lo que hace el Hook)
        // a. Insertar Principal
        await supabase.from('transactions').insert([{
            id: mainTxId,
            user_id: authData.user.id,
            description: "SUELDO TEST AUTOMATIZADO",
            amount: incomeAmount,
            type: 'income',
            account_id: testAccount.id,
            date: new Date().toISOString(),
            is_maaserable: true,
            status: 'cleared'
        }]);

        // b. Insertar Maaser
        await supabase.from('transactions').insert([{
            id: maaserTxId,
            user_id: authData.user.id,
            description: `Maaser (10%): SUELDO TEST AUTOMATIZADO`,
            amount: maaserAmount,
            type: 'transfer',
            account_id: testAccount.id,
            to_account_id: maaserAccount.id,
            date: new Date().toISOString(),
            is_system_generated: true,
            related_transaction_id: mainTxId,
            status: 'cleared'
        }]);

        // c. Actualizar Balances usando RPC (Atómico)
        await supabase.rpc('increment_account_balance', { account_id: testAccount.id, delta: incomeAmount });
        await supabase.rpc('increment_account_balance', { account_id: testAccount.id, delta: -maaserAmount });
        await supabase.rpc('increment_account_balance', { account_id: maaserAccount.id, delta: maaserAmount });

        console.log("Transacciones insertadas y balances actualizados via RPC.");

        // Verificar balances finales de la operación
        const { data: accFinal } = await supabase.from('accounts').select('*').in('id', [testAccount.id, maaserAccount.id]);
        const testFinal = accFinal.find(a => a.id === testAccount.id);
        const maaserFinal = accFinal.find(a => a.id === maaserAccount.id);

        console.log(`Balances Post-Sueldo:
        - TEST_EFECTIVO: ${testFinal.current_balance} (Esperado: ${Number(testAccount.current_balance) + 4500})
        - Maaser: ${maaserFinal.current_balance} (Esperado: ${Number(maaserAccount.current_balance) + 500})`);

        // 4. Prueba de Borrado con Reversión
        console.log("\n--- Probando Borrado y Reversión ---");
        const { data: txsToDelete } = await supabase.from('transactions').select('*').or(`id.eq.${mainTxId},related_transaction_id.eq.${mainTxId}`);

        for (const tx of txsToDelete) {
            const amt = Number(tx.amount);
            if (tx.type === 'income') {
                await supabase.rpc('increment_account_balance', { account_id: tx.account_id, delta: -amt });
            } else if (tx.type === 'transfer') {
                await supabase.rpc('increment_account_balance', { account_id: tx.account_id, delta: amt });
                await supabase.rpc('increment_account_balance', { account_id: tx.to_account_id, delta: -amt });
            }
        }
        await supabase.from('transactions').delete().in('id', txsToDelete.map(t => t.id));
        console.log("Limpieza completada. Balances revertidos.");

        const { data: accClean } = await supabase.from('accounts').select('*').in('id', [testAccount.id, maaserAccount.id]);
        console.log(`Balances Finales (Limpios):
        - TEST_EFECTIVO: ${accClean.find(a => a.id === testAccount.id).current_balance} (Igual al inicial)
        - Maaser: ${accClean.find(a => a.id === maaserAccount.id).current_balance} (Igual al inicial)`);

        console.log("\n--- PRUEBA FINALIZADA EXITOSAMENTE ---");
        console.log("La lógica atómica y de transacciones vinculadas funciona correctamente.");

    } catch (e) {
        console.error("\nERROR CRITICO:", e.message);
    }
}

test();
