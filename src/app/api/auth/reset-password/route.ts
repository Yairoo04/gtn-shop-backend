import { NextResponse } from "next/server";
import crypto from "crypto";
import sql from "mssql";
import { getPool } from "../../../lib/db";

function hashPassword(password: string, salt: Buffer): Buffer {
    return crypto
        .createHash("sha512")
        .update(Buffer.concat([
            salt,
            Buffer.from(password, "utf16le")  
        ]))
        .digest();
}

export async function POST(req: Request) {
    try {
        const { token, newPassword } = await req.json();
        const pool = await getPool();

        // 1. Lấy user từ token
        const resUser = await pool.request()
            .input("Token", sql.NVarChar, token)
            .query(`
                SELECT UserId, ResetTokenExpires
                FROM Users
                WHERE ResetToken = @Token
            `);

        if (resUser.recordset.length === 0) {
            return NextResponse.json({ message: "Token không hợp lệ" }, { status: 400 });
        }

        const user = resUser.recordset[0];

        // 2. Kiểm tra token hết hạn
        if (new Date(user.ResetTokenExpires) < new Date()) {
            return NextResponse.json({ message: "Token đã hết hạn" }, { status: 400 });
        }

        // 3. Tạo salt mới (32 bytes)
        const newSalt = crypto.randomBytes(32);

        // 4. Hash đúng chuẩn SQL Server
        const newHash = hashPassword(newPassword, newSalt);

        // 5. Cập nhật vào DB
        await pool.request()
            .input("UserId", sql.Int, user.UserId)
            .input("PasswordSalt", sql.VarBinary, newSalt)
            .input("PasswordHash", sql.VarBinary, newHash)
            .query(`
                UPDATE Users
                SET PasswordSalt = @PasswordSalt,
                    PasswordHash = @PasswordHash,
                    ResetToken = NULL,
                    ResetTokenExpires = NULL,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE UserId = @UserId
            `);

        return NextResponse.json({ message: "Đổi mật khẩu thành công" });

    } catch (err) {
        console.error("Reset password error:", err);
        return NextResponse.json({ message: "Lỗi server" }, { status: 500 });
    }
}
