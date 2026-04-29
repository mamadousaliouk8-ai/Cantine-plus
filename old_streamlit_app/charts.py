"""Fonctions utilitaires pour les graphiques Plotly réutilisables."""

import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

PALETTE = {
    "green": "#4CAF50",
    "green_dark": "#2E7D32",
    "green_light": "#C8E6C9",
    "red": "#F44336",
    "orange": "#FF9800",
    "blue": "#2196F3",
    "gray": "#F5F5F5",
}

LAYOUT_BASE = dict(
    plot_bgcolor="white",
    paper_bgcolor="white",
    font=dict(family="Inter, sans-serif", size=12),
    margin=dict(t=40, b=40, l=40, r=20),
)


def waste_trend_chart(df: pd.DataFrame, height: int = 320) -> go.Figure:
    """Courbe double axe : gaspillage + participation dans le temps."""
    df_daily = df.groupby("date")[["taux_gaspillage", "taux_participation"]].mean().reset_index()
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df_daily["date"], y=df_daily["taux_gaspillage"],
        name="Gaspillage (%)", line=dict(color=PALETTE["red"], width=2),
        fill="tozeroy", fillcolor="rgba(244,67,54,0.08)",
    ))
    fig.add_trace(go.Scatter(
        x=df_daily["date"], y=df_daily["taux_participation"],
        name="Participation (%)", line=dict(color=PALETTE["green"], width=2),
        yaxis="y2",
    ))
    fig.update_layout(
        **LAYOUT_BASE,
        height=height,
        yaxis=dict(title="Gaspillage (%)", color=PALETTE["red"]),
        yaxis2=dict(title="Participation (%)", overlaying="y", side="right", color=PALETTE["green"]),
        legend=dict(orientation="h", y=-0.25),
    )
    return fig


def popularity_bar_chart(df: pd.DataFrame, top_n: int = 8, ascending: bool = False) -> go.Figure:
    """Barres horizontales : popularité des plats."""
    data = (
        df.groupby("plat")["taux_participation"].mean()
        .sort_values(ascending=ascending).head(top_n).reset_index()
    )
    color_scale = [PALETTE["green_light"], PALETTE["green"]] if not ascending else [PALETTE["red"], "#FFCDD2"]
    fig = px.bar(
        data, x="taux_participation", y="plat", orientation="h",
        color="taux_participation",
        color_continuous_scale=color_scale,
        labels={"taux_participation": "Participation (%)", "plat": "Plat"},
    )
    fig.update_layout(**LAYOUT_BASE, coloraxis_showscale=False)
    return fig


def co2_by_dish_chart(df: pd.DataFrame) -> go.Figure:
    """Barres CO₂ par plat principal."""
    co2 = df.groupby("plat")["co2_kg"].mean().sort_values(ascending=False).reset_index()
    fig = px.bar(
        co2, x="plat", y="co2_kg",
        color="co2_kg",
        color_continuous_scale=[PALETTE["green_light"], PALETTE["green_dark"]],
        labels={"co2_kg": "CO₂ (kg)", "plat": "Plat"},
    )
    fig.update_layout(**LAYOUT_BASE, coloraxis_showscale=False, xaxis_tickangle=-35)
    return fig


def cantine_pie_chart(df: pd.DataFrame, metric: str = "taux_gaspillage") -> go.Figure:
    """Camembert par cantine."""
    data = df.groupby("cantine")[metric].mean().reset_index()
    fig = px.pie(
        data, values=metric, names="cantine",
        color_discrete_sequence=[PALETTE["green"], "#81C784", PALETTE["green_light"]],
        hole=0.45,
    )
    fig.update_layout(**LAYOUT_BASE)
    fig.update_traces(textinfo="percent+label")
    return fig


def forecast_vs_real_chart(df: pd.DataFrame, n_days: int = 30) -> go.Figure:
    """Barres groupées : convives prévus vs réels."""
    sample = df.tail(n_days).copy()
    fig = go.Figure()
    fig.add_trace(go.Bar(x=sample["date"].astype(str), y=sample["nb_convives_prevus"],
                         name="Prévus", marker_color="#81C784"))
    fig.add_trace(go.Bar(x=sample["date"].astype(str), y=sample["nb_convives_reels"],
                         name="Réels", marker_color=PALETTE["green"]))
    fig.update_layout(**LAYOUT_BASE, barmode="group", xaxis_tickangle=-45)
    return fig
