import Head from 'next/head'
import CompareExcel from './CompareExcel'

export default function Home() {
    return (
        <>
            <Head>
                <title>Diff Stuff</title>
                <meta name="description" content="Diff stuff" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <CompareExcel />
        </>
    )
}
