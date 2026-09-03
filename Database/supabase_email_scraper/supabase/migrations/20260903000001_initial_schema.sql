CREATE TABLE dockets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    docket_number TEXT UNIQUE NOT NULL,

    docket_type TEXT NOT NULL,

    docket_date DATE,

    email_sender TEXT,

    email_subject TEXT,

    command_job_number TEXT,

    plant_name TEXT,

    plant_number TEXT,

    customer_number TEXT,

    customer_name TEXT,

    delivery_address TEXT,

    purchase_order TEXT,

    truck_number TEXT,

    vehicle_registration TEXT,

    driver_name TEXT,

    time_dispatched TIMESTAMP,

    time_batched TIMESTAMP,

    arrive_jobsite TIMESTAMP,

    time_finished TIMESTAMP,

    total_time_on_site INTERVAL,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE docket_loads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    docket_id UUID REFERENCES dockets(id),

    product TEXT,

    material_code TEXT,

    quantity DECIMAL,

    unit TEXT,

    gross_weight DECIMAL,

    tare_weight DECIMAL,

    net_weight DECIMAL,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trucks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    truck_number TEXT UNIQUE,

    registration TEXT,

    truck_type TEXT,

    active BOOLEAN DEFAULT TRUE,

    purchase_date DATE,

    purchase_price DECIMAL,

    created_at TIMESTAMP DEFAULT NOW()
);