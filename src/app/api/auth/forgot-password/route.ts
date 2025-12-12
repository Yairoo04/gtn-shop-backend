import { NextResponse } from "next/server";
import sql from "mssql";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { getPool } from "../../../lib/db";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        const pool = await getPool();
        const check = await pool.request()
            .input("Email", sql.NVarChar, email)
            .query("SELECT UserId FROM Users WHERE Email = @Email");

        if (check.recordset.length === 0) {
            return NextResponse.json({ message: "Email không tồn tại" }, { status: 404 });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        await pool.request()
            .input("Email", sql.NVarChar, email)
            .input("Token", sql.NVarChar, token)
            .input("Expires", sql.DateTime, expires)
            .query(`
        UPDATE Users
        SET ResetToken = @Token, ResetTokenExpires = @Expires
        WHERE Email = @Email
      `);

        const resetUrl = `${process.env.NEXT_PUBLIC_CLIENT_URL}/reset-password?token=${token}`;

        const mailer = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await mailer.sendMail({
            to: email,
            subject: "Khôi phục mật khẩu",
            html: `
        <p>GTN Shop xin chào!</p>
        <p>Chúng tôi vừa nhận được yêu cầu Quên mật khẩu từ bạn.</p>
        <p>Nhấn vào link bên dưới để đặt lại mật khẩu.</p>
        <a href="${resetUrl}">${resetUrl}</a>
      `,
        });

        return NextResponse.json({ message: "Email đặt lại mật khẩu đã được gửi" });

    } catch (err) {
        return NextResponse.json({ message: "Lỗi máy chủ" }, { status: 500 });
    }
}
