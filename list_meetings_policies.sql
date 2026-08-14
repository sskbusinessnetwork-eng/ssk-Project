SELECT 
    pol.polname AS policy_name,
    pol.polcmd AS command,
    pol.polqual AS using_expression,
    pol.polwithcheck AS with_check_expression
FROM 
    pg_policy pol
JOIN 
    pg_class tbl ON pol.polrelid = tbl.oid
JOIN 
    pg_namespace nsp ON tbl.relnamespace = nsp.oid
WHERE 
    tbl.relname = 'meetings';
