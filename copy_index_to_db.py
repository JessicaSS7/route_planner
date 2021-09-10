import psycopg2

#connect to the database
DATABASE_URL = 'postgres://onbjletaqosrfy:4f800ae0295b2c9c2ef51ffed6b0ffd87071bf58dfe328921cb6d30e508b3aca@ec2-3-233-100-43.compute-1.amazonaws.com:5432/d6lckpa26hmq9j'

conn = psycopg2.connect(DATABASE_URL, sslmode='require')

#create a cursor object 
#cursor object is used to interact with the database
cur = conn.cursor()

#create table with same headers as csv file
cur.execute('''DROP TABLE IF EXISTS index''')

cur.execute('''CREATE TABLE IF NOT EXISTS index (
    Name text,
    Address text,
    City text,
    latitude float,
    longitude float,
    categories text
)''')

with open('index.csv', 'r') as f:
    cur.copy_from(f, 'index', sep=',')
    conn.commit()
    conn.close()

f.close()
