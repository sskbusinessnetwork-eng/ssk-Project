import * as bcrypt1 from "bcryptjs";
import bcrypt2 from "bcryptjs";
import * as crypto1 from "crypto";
import crypto2 from "crypto";
console.log(typeof bcrypt1.hashSync, typeof bcrypt2.hashSync);
console.log(typeof crypto1.createHash, typeof crypto2.createHash);
