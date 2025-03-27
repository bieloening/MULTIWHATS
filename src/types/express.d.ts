import { Multer } from 'multer';

declare global {
    namespace Express {
        interface Request {
            file?: Multer.File; // Usa o tipo correto do multer
        }
    }
}
