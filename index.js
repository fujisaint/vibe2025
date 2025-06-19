const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root1234',
    database: 'todolist',
};

async function retrieveListItems() {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, text FROM items');
    await connection.end();
    return rows;
}

async function deleteItemFromDb(id) {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
        'DELETE FROM items WHERE id = ?',
        [id]
    );
    await connection.end();
}

async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td><button class="delete-btn" onclick="deleteItem(${item.id})">Remove</button></td>
        </tr>
    `).join('');
}

async function handleRequest(req, res) {
    if (req.url === '/' && req.method === 'GET') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                'utf8'
            );
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Ошибка загрузки страницы');
        }
    } else if (req.url.startsWith('/delete/') && req.method === 'DELETE') {
        try {
            const id = req.url.split('/')[2];
            await deleteItemFromDb(id);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка удаления' }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Страница не найдена');
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
